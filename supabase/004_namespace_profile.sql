-- 네임스페이스에 프로필 정보 추가
alter table namespaces add column if not exists display_name text;
alter table namespaces add column if not exists bio text;
alter table namespaces add column if not exists avatar_url text;

-- display_name: 화면에 표시되는 이름 (네임스페이스와 다를 수 있음)
-- bio: 한줄 소개
-- avatar_url: 프로필 이미지 URL (외부 URL, 초기에는 직접 입력)
