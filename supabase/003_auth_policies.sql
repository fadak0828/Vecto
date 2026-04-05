-- 네임스페이스 생성은 인증된 사용자만
create policy "Authenticated users can create namespaces"
  on namespaces for insert with check (auth.uid() = owner_id);

-- 네임스페이스 소유자만 수정/삭제
create policy "Owners can update namespaces"
  on namespaces for update using (auth.uid() = owner_id);

create policy "Owners can delete namespaces"
  on namespaces for delete using (auth.uid() = owner_id);

-- 서브링크 (namespace_id가 있는 slug) 관리는 소유자만
-- 기존 "Anyone can create slugs" 정책은 무료 URL용 (namespace_id = null)
-- 네임스페이스 서브링크는 owner_id가 일치해야 함

-- users 테이블에 auth 연동
create policy "Users can read own data"
  on users for select using (auth.uid() = id);

create policy "Users can insert own data"
  on users for insert with check (auth.uid() = id);
