-- 在 Supabase：SQL Editor → 执行本脚本（新建项目或首次建表）
-- 安全模型：匿名仅可新建预约/评价；仅登录用户可读改删预约；匿名通过 RPC 查询某日已占时段（不暴露客户隐私）

create table if not exists public.bookings (
  id serial primary key,
  name text not null,
  phone text not null,
  service text not null,
  date text not null,
  time text not null,
  notes text not null default '',
  status text not null default 'pending',
  constraint bookings_status_check check (
    status in ('pending', 'confirmed', 'cancelled')
  )
);

create table if not exists public.reviews (
  id serial primary key,
  name text not null,
  rating integer not null,
  comment text not null,
  date text not null
);

-- 同一日期+时段仅允许一条「未取消」预约（防并发重复插入）
create unique index if not exists bookings_one_active_per_slot
  on public.bookings (date, time)
  where status <> 'cancelled';

-- 匿名可调用：返回某日已被占用的时间段（不含客户姓名电话）
create or replace function public.get_booked_times_for_date(p_date text)
returns text[]
language sql
security definer
set search_path = public
as $$
  select coalesce(
    array_agg(time order by time),
    array[]::text[]
  )
  from bookings
  where date = p_date
    and status <> 'cancelled';
$$;

revoke all on function public.get_booked_times_for_date(text) from public;
grant execute on function public.get_booked_times_for_date(text) to anon, authenticated;

alter table public.bookings enable row level security;
alter table public.reviews enable row level security;

drop policy if exists "bookings_select_all" on public.bookings;
drop policy if exists "bookings_insert_all" on public.bookings;
drop policy if exists "bookings_update_all" on public.bookings;
drop policy if exists "bookings_delete_all" on public.bookings;
drop policy if exists "bookings_select_authenticated" on public.bookings;
drop policy if exists "bookings_insert_public" on public.bookings;
drop policy if exists "bookings_update_authenticated" on public.bookings;
drop policy if exists "bookings_delete_authenticated" on public.bookings;

drop policy if exists "reviews_select_all" on public.reviews;
drop policy if exists "reviews_insert_all" on public.reviews;
drop policy if exists "reviews_select_public" on public.reviews;
drop policy if exists "reviews_insert_public" on public.reviews;

-- 预约：仅登录用户可列表/改状态/删除；任何人可插入新预约
create policy "bookings_select_authenticated"
  on public.bookings for select
  to authenticated
  using (true);

create policy "bookings_insert_public"
  on public.bookings for insert
  to anon, authenticated
  with check (true);

create policy "bookings_update_authenticated"
  on public.bookings for update
  to authenticated
  using (true)
  with check (true);

create policy "bookings_delete_authenticated"
  on public.bookings for delete
  to authenticated
  using (true);

-- 评价：所有人可读、可发表；不提供 update/delete（防篡改/删他人评价需另做管理员策略）
create policy "reviews_select_public"
  on public.reviews for select
  to anon, authenticated
  using (true);

create policy "reviews_insert_public"
  on public.reviews for insert
  to anon, authenticated
  with check (true);
