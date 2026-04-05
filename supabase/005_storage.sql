-- 프로필 이미지용 Storage 버킷
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 누구나 읽기 가능 (프로필 이미지는 공개)
create policy "Public read avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- 인증된 사용자만 업로드
create policy "Auth users can upload avatars"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid() is not null);

-- 자신의 파일만 삭제/덮어쓰기
create policy "Users can update own avatars"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can delete own avatars"
  on storage.objects for delete
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
