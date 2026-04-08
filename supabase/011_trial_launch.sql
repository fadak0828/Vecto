-- 011_trial_launch.sql — 1개월 무료 체험 (trialing 상태) 추가
--
-- 플랜: 빌링키 등록 → 즉시 과금 아님 → PortOne schedulePayment(+30d) → D+30 첫 결제
-- 기존 process_subscription_charge / cancel_subscription 가드에 'trialing' 추가.
-- start_trial RPC 신설 — BillingKey.Issued 웹훅 경로에서 호출.
--
-- 실행: Supabase Dashboard → SQL Editor, 또는 /run-sql
-- 의존: 009_subscriptions.sql
-- Eng review fixes: A1, A2, A4 (silent-failure guards)

-- ============================================================================
-- 1. subscriptions.status CHECK constraint — 'trialing' 추가
-- ============================================================================
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('pending', 'trialing', 'active', 'past_due', 'canceled', 'failed'));

-- ============================================================================
-- 2. subs_one_active_per_user UNIQUE INDEX — 'trialing' 포함
-- ============================================================================
-- trialing도 한 유저당 1개만 허용. 체험과 유료 동시 금지.
DROP INDEX IF EXISTS subs_one_active_per_user;
CREATE UNIQUE INDEX subs_one_active_per_user
  ON subscriptions(user_id)
  WHERE status IN ('pending', 'trialing', 'active', 'past_due');

-- 상태별 인덱스에도 trialing 추가 (D-N 쿼리용)
DROP INDEX IF EXISTS subs_status_idx;
CREATE INDEX subs_status_idx
  ON subscriptions(status)
  WHERE status IN ('trialing', 'active', 'past_due');

-- current_period_end 인덱스에 trialing 포함 (D-7 cron + 대시보드 D-N)
DROP INDEX IF EXISTS subs_current_period_end_idx;
CREATE INDEX subs_current_period_end_idx
  ON subscriptions(current_period_end)
  WHERE status IN ('trialing', 'active');

-- ============================================================================
-- 3. process_subscription_charge RPC — 가드에 'trialing' 추가 (Eng A2 fix)
-- ============================================================================
-- D+30 PortOne scheduled charge 성공 시 trialing → active 전환.
-- 기존 코드는 WHERE status IN ('active', 'past_due')만 허용 → silent skip 버그.
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
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- 2. Advance subscription period — trialing/active/past_due 모두 active로 수렴
  -- ENG A2 FIX: 'trialing' 포함. 기존 가드는 D+30 trial charge를 silent skip했음.
  UPDATE subscriptions
  SET
    current_period_start = current_period_end,
    current_period_end = add_months(current_period_end, 1),
    status = 'active',
    past_due_since = NULL,
    failed_charge_count = 0,
    updated_at = now()
  WHERE id = p_subscription_id
    AND status IN ('trialing', 'active', 'past_due')
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
-- 4. cancel_subscription RPC — 가드에 'trialing' 추가 (Eng A4 fix)
-- ============================================================================
-- 체험 중 해지 허용. 환불 경로 없음 (과금 자체가 없었으므로).
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
    AND status IN ('trialing', 'active', 'past_due')  -- ENG A4 FIX: trialing 추가
  RETURNING portone_billing_key_id INTO v_billing_key;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN v_billing_key;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. start_trial RPC — 체험 시작 (BillingKey.Issued 경로)
-- ============================================================================
-- 호출: webhook BillingKey.Issued 분기에서 schedulePayment 성공 직후.
-- 효과: subscription을 trialing 상태로 설정, current_period_end = now+30d,
--       namespaces.payment_status = 'active', paid_until = trial_end.
-- 반환: trial_end_at (앱이 사용자에게 노출)
CREATE OR REPLACE FUNCTION start_trial(
  p_subscription_id UUID,
  p_trial_days INTEGER DEFAULT 30
) RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_ns_id UUID;
  v_trial_end TIMESTAMPTZ;
  v_now TIMESTAMPTZ := now();
BEGIN
  v_trial_end := v_now + (p_trial_days || ' days')::interval;

  UPDATE subscriptions
  SET
    status = 'trialing',
    current_period_start = v_now,
    current_period_end = v_trial_end,
    updated_at = v_now
  WHERE id = p_subscription_id
    AND status = 'pending'
  RETURNING namespace_id INTO v_ns_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  UPDATE namespaces
  SET payment_status = 'active', paid_until = v_trial_end
  WHERE id = v_ns_id;

  RETURN v_trial_end;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. subscriptions_public view — trialing 상태 노출 (기존 view는 status 포함되어 자동 OK)
-- ============================================================================
-- 009에서 subscriptions_public은 status를 그대로 SELECT하므로 재작성 불필요.
-- 확인만: view가 invoker 권한 + RLS 적용되어 본인 trialing row만 읽힘.

-- ============================================================================
-- 7. launch_event_funnel_v1 view — 가입/빌링키/D+30/D+60 funnel
-- ============================================================================
-- 사용법: SELECT * FROM launch_event_funnel_v1 ORDER BY cohort_date DESC;
-- 일자별 cohort: auth.users.created_at 기준.
--
-- 컬럼:
--   cohort_date        : 가입 일자 (KST)
--   signups            : 해당 일자 가입자 수
--   billing_key_count  : subscription이 trialing 이상으로 생성된 수 (= 빌링키 등록 성공)
--   trial_active       : 아직 trialing 상태인 수 (D+30 도달 전)
--   converted_d30      : D+30 후 active로 전환된 수 (첫 결제 성공)
--   canceled_in_trial  : 체험 중 해지된 수
--   still_active_d60   : D+60 시점 아직 active인 수 (두 번째 결제 성공)
CREATE OR REPLACE VIEW launch_event_funnel_v1 AS
WITH user_cohorts AS (
  SELECT
    u.id AS user_id,
    date_trunc('day', u.created_at AT TIME ZONE 'Asia/Seoul')::date AS cohort_date,
    u.created_at AS signup_at
  FROM auth.users u
  WHERE u.created_at >= '2026-04-01'  -- 런칭 event cohort 시작 기준
),
user_subs AS (
  SELECT
    uc.cohort_date,
    uc.user_id,
    uc.signup_at,
    s.id AS sub_id,
    s.status,
    s.created_at AS sub_created_at,
    s.canceled_at,
    s.current_period_start,
    s.current_period_end
  FROM user_cohorts uc
  LEFT JOIN subscriptions s ON s.user_id = uc.user_id
)
SELECT
  cohort_date,
  COUNT(DISTINCT user_id) AS signups,
  COUNT(DISTINCT sub_id) FILTER (
    WHERE status IN ('trialing', 'active', 'past_due', 'canceled')
  ) AS billing_key_count,
  COUNT(DISTINCT sub_id) FILTER (WHERE status = 'trialing') AS trial_active,
  COUNT(DISTINCT sub_id) FILTER (
    WHERE status = 'active'
    AND sub_created_at < now() - interval '30 days'
  ) AS converted_d30,
  COUNT(DISTINCT sub_id) FILTER (
    WHERE status = 'canceled'
    AND (canceled_at - sub_created_at) < interval '30 days'
  ) AS canceled_in_trial,
  COUNT(DISTINCT sub_id) FILTER (
    WHERE status = 'active'
    AND sub_created_at < now() - interval '60 days'
  ) AS still_active_d60
FROM user_subs
GROUP BY cohort_date
ORDER BY cohort_date DESC;

COMMENT ON VIEW launch_event_funnel_v1 IS
  '런칭 이벤트 cohort funnel. cohort_date별 가입→빌링키→D+30→D+60 전환 측정.';

COMMENT ON FUNCTION start_trial IS
  '무료 체험 시작. pending subscription → trialing. 호출처: webhook BillingKey.Issued.';
COMMENT ON FUNCTION process_subscription_charge IS
  'Idempotent charge handler. trialing/active/past_due → active. (ENG A2 fix)';
COMMENT ON FUNCTION cancel_subscription IS
  'Atomic cancel with IDOR guard. trialing/active/past_due 허용. (ENG A4 fix)';
