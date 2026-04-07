-- 010_fix_user_fks.sql
-- subscriptions.user_id 와 payments.owner_id 가 비어있는 public.users 를 참조해서
-- 모든 결제 준비 호출이 FK 위반(23503)으로 500을 던지던 버그 수정.
--
-- 변경:
--   1. subscriptions_user_id_fkey  → auth.users(id) ON DELETE CASCADE
--   2. payments_owner_id_fkey      → auth.users(id) ON DELETE SET NULL
--   3. 사용처가 없는 public.users 테이블 삭제
--
-- 영향:
--   - /api/payment/prepare 가 정상 동작
--   - /api/cron/expire 의 갱신 안내 메일은 별도 PR에서 auth.users 를 읽도록 수정
--
-- 멱등하게 실행 가능 (DROP CONSTRAINT IF EXISTS, DROP TABLE IF EXISTS).

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_owner_id_fkey;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_owner_id_fkey
  FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE SET NULL;

DROP TABLE IF EXISTS public.users;
