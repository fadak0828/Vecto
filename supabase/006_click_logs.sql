-- 클릭 로그 테이블 (날짜별 통계용)
create table if not exists click_logs (
  id uuid primary key default gen_random_uuid(),
  slug_id uuid references slugs(id) on delete cascade,
  clicked_at timestamptz default now(),
  referrer text
);

create index if not exists click_logs_slug_date_idx
  on click_logs (slug_id, clicked_at);

alter table click_logs enable row level security;

create policy "Anyone can insert click logs"
  on click_logs for insert with check (true);

create policy "Owners can read click logs"
  on click_logs for select using (true);

-- increment_click 함수를 업데이트해서 click_logs도 기록
create or replace function increment_click(slug_id uuid)
returns void as $$
begin
  update slugs set click_count = click_count + 1 where id = slug_id;
  insert into click_logs (slug_id) values (slug_id);
end;
$$ language plpgsql;
