-- 009_subscriptions.sql — Single SKU Freemium subscriptions
-- /autoplan 리뷰 fixes 반영:
--   ENG-C1: process_subscription_charge RPC idempotency (IF NOT FOUND THEN RETURN)
--   ENG-C5: subscriptions_public view WITH (security_invoker=true)
--   ENG-H1: cancel_subscription RPC (atomic)
--   ENG-H4: 'failed' subscription status 추가 (BillingKey.Failed rollback)
--   ENG-C4: resubscribe_preserve_period helper (기존 canceled 구독의 period_end 보존)
--   ENG-M2: 008 grace users backfill = Option B (즉시 free + 이메일 준비)
--
-- 실행: Supabase Dashboard → SQL Editor, 또는 /run-sql

-- ============================================================================
-- 0. payments.period_months CHECK 완화 (1=월구독, 3/6/12=레거시)
-- ============================================================================
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_period_months_check;
ALTER TABLE payments ADD CONSTRAINT payments_period_months_check
  CHECK (period_months IN (1, 3, 6, 12));

-- ============================================================================
-- 1. subscriptions 테이블
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  namespace_id UUID NOT NULL REFERENCES namespaces(id) ON DELETE CASCADE,
  -- SECURITY: 절대 anon/authenticated에 노출 금지. subscriptions_public view에 포함 안 됨.
  portone_billing_key_id TEXT UNIQUE,
  -- ENG-H4: 'failed' 추가 — BillingKey.Failed 시 rollback 대상
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'past_due', 'canceled', 'failed')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  past_due_since TIMESTAMPTZ,
  failed_charge_count INT NOT NULL DEFAULT 0,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 사용자당 활성/대기/past_due 구독 1개만 (failed/canceled는 제외 → 재시도/재구독 허용)
CREATE UNIQUE INDEX IF NOT EXISTS subs_one_active_per_user
  ON subscriptions(user_id)
  WHERE status IN ('pending', 'active', 'past_due');

CREATE INDEX IF NOT EXISTS subs_status_idx
  ON subscriptions(status)
  WHERE status IN ('active', 'past_due');

CREATE INDEX IF NOT EXISTS subs_current_period_end_idx
  ON subscriptions(current_period_end)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS subs_past_due_since_idx
  ON subscriptions(past_due_since)
  WHERE status = 'past_due';

CREATE INDEX IF NOT EXISTS subs_namespace_idx ON subscriptions(namespace_id);

-- ============================================================================
-- 2. RLS
-- ============================================================================
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- 본인 구독만 읽기 (단, 이 정책은 subscriptions 테이블 직접 접근용. 일반 앱은 view 사용)
DROP POLICY IF EXISTS "users read own subscription" ON subscriptions;
CREATE POLICY "users read own subscription"
  ON subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- service_role 전체 접근 (webhook, cron, prepare, cancel 등)
DROP POLICY IF EXISTS "service role full access on subscriptions" ON subscriptions;
CREATE POLICY "service role full access on subscriptions"
  ON subscriptions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================================
-- 3. subscriptions_public view — ENG-C5: security_invoker=true로 RLS enforce
-- ============================================================================
-- 중요: billing_key_id 컬럼 절대 포함 금지
-- security_invoker=true → view가 caller 권한으로 실행 → 베이스 RLS 적용
DROP VIEW IF EXISTS subscriptions_public;
CREATE VIEW subscriptions_public WITH (security_invoker=true) AS
  SELECT
    id, user_id, namespace_id, status,
    current_period_start, current_period_end,
    canceled_at, past_due_since, failed_charge_count,
    cancel_reason, created_at, updated_at
  FROM subscriptions;

GRANT SELECT ON subscriptions_public TO authenticated;

-- ============================================================================
-- 4. payments.subscription_id FK — 구독 charges 식별 + refund loophole plug
-- ============================================================================
ALTER TABLE payments ADD COLUMN IF NOT EXISTS subscription_id UUID
  REFERENCES subscriptions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS payments_subscription_idx
  ON payments(subscription_id)
  WHERE subscription_id IS NOT NULL;

-- ============================================================================
-- 5. process_subscription_charge RPC — ENG-C1 IDEMPOTENT
-- ============================================================================
-- CRITICAL FIX: INSERT와 UPDATE 모두 idempotency 보장.
-- PortOne이 같은 paymentId로 webhook을 재전송하면 INSERT는 no-op,
-- 그 뒤 `IF NOT FOUND THEN RETURN;` 로 UPDATE도 스킵 → period_end 중복 advance 방지.
CREATE OR REPLACE FUNCTION process_subscription_charge(
  p_payment_id TEXT,
  p_subscription_id UUID,
  p_amount INTEGER,
  p_paid_at TIMESTAMPTZ
) RETURNS VOID AS $$
DECLARE
  v_ns_id UUID;
  v_new_end TIMESTAMPTZ;
BEGIN
  -- 1. Idempotent insert of payment row
  INSERT INTO payments (
    portone_payment_id, subscription_id, amount, period_months,
    status, paid_at, namespace_id, owner_id
  )
  SELECT
    p_payment_id, p_subscription_id, p_amount, 1,
    'paid', p_paid_at, s.namespace_id, s.user_id
  FROM subscriptions s
  WHERE s.id = p_subscription_id
  ON CONFLICT (portone_payment_id) DO NOTHING;

  -- ENG-C1 FIX: INSERT가 no-op이면 retry이므로 즉시 리턴.
  -- FOUND는 직전 statement가 실제로 row에 영향을 줬는지 반영.
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- 2. Advance subscription period (active/past_due 전환 포함)
  UPDATE subscriptions
  SET
    current_period_start = current_period_end,
    current_period_end = add_months(current_period_end, 1),
    status = 'active',
    past_due_since = NULL,
    failed_charge_count = 0,
    updated_at = now()
  WHERE id = p_subscription_id
    AND status IN ('active', 'past_due')
  RETURNING namespace_id, current_period_end INTO v_ns_id, v_new_end;

  -- 3. Sync namespaces.payment_status + paid_until
  IF v_ns_id IS NOT NULL THEN
    UPDATE namespaces
    SET payment_status = 'active', paid_until = v_new_end
    WHERE id = v_ns_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. start_subscription RPC — 첫 charge (billing key 발급 직후)
-- ============================================================================
-- 기간: 첫 charge 시점부터 1개월. 기존 paid_until이 더 미래면 그것 유지.
CREATE OR REPLACE FUNCTION start_subscription(
  p_subscription_id UUID,
  p_paid_at TIMESTAMPTZ
) RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_ns_id UUID;
  v_base_date TIMESTAMPTZ;
  v_new_end TIMESTAMPTZ;
  v_current_paid_until TIMESTAMPTZ;
  v_current_payment_status TEXT;
BEGIN
  SELECT namespace_id INTO v_ns_id FROM subscriptions WHERE id = p_subscription_id;
  IF v_ns_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT paid_until, payment_status INTO v_current_paid_until, v_current_payment_status
  FROM namespaces WHERE id = v_ns_id;

  -- ENG-C4: 기존 namespaces.paid_until이 미래면 거기부터 연장
  v_base_date := CASE
    WHEN v_current_payment_status = 'active'
         AND v_current_paid_until IS NOT NULL
         AND v_current_paid_until > p_paid_at
    THEN v_current_paid_until
    ELSE p_paid_at
  END;

  v_new_end := add_months(v_base_date, 1);

  UPDATE subscriptions
  SET
    status = 'active',
    current_period_start = v_base_date,
    current_period_end = v_new_end,
    updated_at = now()
  WHERE id = p_subscription_id
    AND status IN ('pending', 'past_due');

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  UPDATE namespaces
  SET payment_status = 'active', paid_until = v_new_end
  WHERE id = v_ns_id;

  RETURN v_new_end;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. cancel_subscription RPC — ENG-H1 ATOMIC
-- ============================================================================
-- 권한 확인 + status 전환 + billing_key_id 반환 (route가 PortOne unschedule 호출용).
-- 중요: namespaces.paid_until은 건드리지 않음 — 사용자는 period_end까지 유료 유지.
CREATE OR REPLACE FUNCTION cancel_subscription(
  p_subscription_id UUID,
  p_user_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
  v_billing_key TEXT;
BEGIN
  UPDATE subscriptions
  SET
    status = 'canceled',
    canceled_at = now(),
    cancel_reason = p_reason,
    updated_at = now()
  WHERE id = p_subscription_id
    AND user_id = p_user_id  -- IDOR guard
    AND status IN ('active', 'past_due')
  RETURNING portone_billing_key_id INTO v_billing_key;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN v_billing_key;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. expire_past_due_subscriptions RPC — cron 14d timeout (ENG-H2 bulk)
-- ============================================================================
-- 14d past_due → canceled + namespaces free. Bulk UPDATE로 N+1 방지.
CREATE OR REPLACE FUNCTION expire_past_due_subscriptions(
  p_grace_days INTEGER DEFAULT 14
) RETURNS TABLE(canceled_count INTEGER) AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH expired AS (
    UPDATE subscriptions
    SET
      status = 'canceled',
      canceled_at = now(),
      cancel_reason = 'past_due_timeout',
      updated_at = now()
    WHERE status = 'past_due'
      AND past_due_since < now() - (p_grace_days || ' days')::interval
    RETURNING id, namespace_id
  )
  UPDATE namespaces n
  SET payment_status = 'free', paid_until = NULL
  FROM expired e
  WHERE n.id = e.namespace_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. 008 grace user backfill — ENG-M2 Option B (plan 원본 A 거부)
-- ============================================================================
-- 008에서 `payment_status='active', paid_until=now()+3mo` 받은 grace 사용자를
-- 즉시 free로 전환. 30일 안내 이메일은 별도 cron (expire_past_due에서 자동으로
-- 처리되지 않으므로 수동 이메일 발송 스크립트 필요 — 주석으로 명시).
--
-- 감지 로직: namespaces.payment_status='active' AND paid_until IS NOT NULL AND
-- namespace_id NOT IN (SELECT namespace_id FROM payments WHERE status='paid')
-- AND namespace_id NOT IN (SELECT namespace_id FROM subscriptions)
--
-- 이 backfill은 009 실행과 동시에 수행. 되돌릴 수 없으므로 실행 전 백업 권장.
UPDATE namespaces
SET payment_status = 'free', paid_until = NULL
WHERE payment_status = 'active'
  AND paid_until IS NOT NULL
  AND id NOT IN (
    SELECT namespace_id FROM payments
    WHERE status = 'paid' AND namespace_id IS NOT NULL
  )
  AND id NOT IN (
    SELECT namespace_id FROM subscriptions
    WHERE namespace_id IS NOT NULL
  );

-- 안내 이메일 발송 대상 기록 (별도 이메일 batch 스크립트에서 사용)
-- 테이블은 ad-hoc: grace 사용자 이메일은 수동으로 발송 (1회성).
-- 필요 시 별도 admin SQL로 목록 추출.

COMMENT ON FUNCTION process_subscription_charge IS 'Idempotent recurring charge handler. Safe against PortOne webhook retries (ENG-C1).';
COMMENT ON FUNCTION start_subscription IS 'First charge handler. Preserves existing future paid_until (ENG-C4).';
COMMENT ON FUNCTION cancel_subscription IS 'Atomic cancel with IDOR guard. Returns billing_key for PortOne unschedule (ENG-H1).';
COMMENT ON FUNCTION expire_past_due_subscriptions IS 'Bulk past_due→canceled after N days. Cron-called (ENG-H2).';
COMMENT ON VIEW subscriptions_public IS 'RLS-enforced subscription view. NEVER exposes portone_billing_key_id (ENG-C5).';
