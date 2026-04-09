-- 서브링크 OG(Open Graph) 메타데이터 컬럼 추가
-- Plan: fadak-main-sublink-detail-og-plan-20260409-141749.md
-- 적용 방법: /run-sql 스킬로 DB에 실행하세요.

ALTER TABLE slugs
  ADD COLUMN og_title       text CHECK (char_length(og_title) <= 500),
  ADD COLUMN og_description text CHECK (char_length(og_description) <= 2000),
  ADD COLUMN og_image       text CHECK (char_length(og_image) <= 2048),
  ADD COLUMN og_site_name   text CHECK (char_length(og_site_name) <= 200),
  ADD COLUMN og_fetched_at  timestamptz,
  ADD COLUMN og_fetch_error text CHECK (char_length(og_fetch_error) <= 200);

COMMENT ON COLUMN slugs.og_fetch_error IS
  '성공 시 NULL. 실패 시 타입 태그: timeout|ssrf_blocked|http_4xx|http_5xx|parse_error|no_og_data|dns_fail|too_large';
