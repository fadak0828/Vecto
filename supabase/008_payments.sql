-- 좌표.to 결제 연동
-- Supabase Dashboard → SQL Editor에서 실행하세요.

-- 1. namespaces: tier 제거, payment_status + paid_until 추가
ALTER TABLE namespaces DROP COLUMN IF EXISTS tier;
ALTER TABLE namespaces ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'free'
  CHECK (payment_status IN ('free', 'active', 'expired'));
ALTER TABLE namespaces ADD COLUMN IF NOT EXISTS paid_until TIMESTAMPTZ;

-- 사용자당 1 namespace 강제
CREATE UNIQUE INDEX IF NOT EXISTS namespaces_owner_id_unique
  ON namespaces (owner_id);

-- 만료 체크 인덱스
CREATE INDEX IF NOT EXISTS namespaces_payment_status_idx
  ON namespaces (payment_status) WHERE payment_status = 'active';
CREATE INDEX IF NOT EXISTS namespaces_paid_until_idx
  ON namespaces (paid_until) WHERE paid_until IS NOT NULL;

-- 2. payments 테이블
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  namespace_id UUID REFERENCES namespaces(id) ON DELETE SET NULL,
  owner_id UUID REFERENCES users(id),
  portone_payment_id TEXT UNIQUE NOT NULL,
  amount INTEGER NOT NULL,
  period_months INTEGER NOT NULL CHECK (period_months IN (3, 6, 12)),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'refunding', 'refunded')),
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- 본인 결제만 읽기
CREATE POLICY "Users can read own payments"
  ON payments FOR SELECT USING (auth.uid() = owner_id);

-- service_role만 모든 작업 가능 (webhook, prepare, refund, verify에서 사용)
-- TO service_role 명시 — anon/authenticated 사용자는 INSERT/UPDATE/DELETE 불가
CREATE POLICY "Service role full access on payments"
  ON payments FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 정확한 달력 계산 함수 (JS setMonth의 1월 31일 + 1개월 = 3월 3일 버그 방지)
CREATE OR REPLACE FUNCTION add_months(base_date timestamptz, months integer)
RETURNS timestamptz AS $$
  SELECT base_date + (months || ' months')::interval
$$ LANGUAGE SQL IMMUTABLE;

-- 3. 기존 namespace에 3개월 무료 grace period 부여
UPDATE namespaces
SET payment_status = 'active',
    paid_until = now() + INTERVAL '3 months'
WHERE payment_status = 'free'
  AND owner_id IS NOT NULL;
