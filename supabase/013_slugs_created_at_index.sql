-- 013_slugs_created_at_index.sql
--
-- 대시보드/설정/공개 프로필이 namespace_id 로 필터 + created_at 으로 정렬한다.
-- 기존 slugs_namespace_slug_idx (namespace_id, slug) 는 slug 유니크 체크용이라
-- ORDER BY created_at 에는 못 탐 → Postgres 가 matching rows 전부 가져와서 sort.
--
-- 이 인덱스는 세 곳의 쿼리에서 "index-ordered scan" 으로 재사용됨:
--   - src/app/dashboard/page.tsx          (대시보드 링크 목록)
--   - src/app/settings/page.tsx           (설정 링크 목록)
--   - src/app/[namespace]/page.tsx        (공개 프로필 링크 목록)
--   - src/lib/server/user-namespace.ts    (위 두 페이지의 공유 로더)

create index if not exists slugs_namespace_created_at_idx
  on slugs (namespace_id, created_at asc)
  where namespace_id is not null;
