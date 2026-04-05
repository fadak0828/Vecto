-- 좌표.to 초기 스키마
-- Supabase Dashboard → SQL Editor에서 실행하세요.

-- 사용자 테이블
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz default now()
);

-- 네임스페이스 테이블
create table if not exists namespaces (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  owner_id uuid references users(id),
  tier text default 'individual' check (tier in ('individual', 'pro')),
  created_at timestamptz default now()
);

-- 슬러그 테이블
create table if not exists slugs (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  target_url text not null,
  owner_id uuid references users(id),
  namespace_id uuid references namespaces(id),
  delete_token uuid,
  expires_at timestamptz,
  click_count int default 0,
  created_by_ip text,
  created_at timestamptz default now()
);

-- 인덱스
create unique index if not exists slugs_slug_free_idx
  on slugs (slug) where namespace_id is null;

create index if not exists slugs_namespace_slug_idx
  on slugs (namespace_id, slug) where namespace_id is not null;

create index if not exists slugs_ip_created_idx
  on slugs (created_by_ip, created_at);

create index if not exists slugs_expires_idx
  on slugs (expires_at) where expires_at is not null;

-- click_count 원자적 증가 RPC
create or replace function increment_click(slug_id uuid)
returns void as $$
  update slugs set click_count = click_count + 1 where id = slug_id;
$$ language sql;

-- RLS (Row Level Security)
alter table slugs enable row level security;
alter table namespaces enable row level security;
alter table users enable row level security;

-- 누구나 슬러그 읽기 가능 (리다이렉트용)
create policy "Anyone can read slugs"
  on slugs for select using (true);

-- 누구나 슬러그 생성 가능 (무료 단축)
create policy "Anyone can create slugs"
  on slugs for insert with check (true);

-- 삭제는 delete_token으로만
create policy "Delete with token"
  on slugs for delete using (true);

-- 네임스페이스는 누구나 읽기 가능
create policy "Anyone can read namespaces"
  on namespaces for select using (true);
