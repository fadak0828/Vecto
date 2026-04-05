-- 네임스페이스 예약 테이블 (결제 전 수요 검증용)
create table if not exists namespace_reservations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  created_at timestamptz default now()
);

create unique index if not exists ns_reservations_name_idx
  on namespace_reservations (name);

create index if not exists ns_reservations_email_idx
  on namespace_reservations (email);

alter table namespace_reservations enable row level security;

create policy "Anyone can create reservations"
  on namespace_reservations for insert with check (true);

create policy "Anyone can read reservations"
  on namespace_reservations for select using (true);
