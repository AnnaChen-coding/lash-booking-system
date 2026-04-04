-- 在 Supabase：SQL Editor → 执行本脚本（新建项目或首次建表）
-- 安全模型：匿名仅可新建预约/评价；仅「admin_emails 表中的邮箱」登录后可读改删预约；匿名通过 RPC 查某日已占时段

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

-- 允许登录后台的邮箱白名单（仅能通过 SQL / Dashboard 维护，API 不向 anon 开放读取）
create table if not exists public.admin_emails (
  email text primary key
);

alter table public.admin_emails disable row level security;
revoke all on public.admin_emails from public;
grant select, insert, update, delete on public.admin_emails to service_role;

-- 执行完本脚本后务必插入你自己的管理员邮箱，例如：
-- insert into public.admin_emails (email) values ('you@example.com');

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

-- JWT 中的邮箱是否在白名单（供 RLS 与前端 RPC 使用）
create or replace function public.is_booking_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_emails a
    where lower(trim(a.email)) = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
  );
$$;

revoke all on function public.is_booking_admin() from public;
grant execute on function public.is_booking_admin() to authenticated;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_booking_admin();
$$;

revoke all on function public.current_user_is_admin() from public;
grant execute on function public.current_user_is_admin() to authenticated;

alter table public.bookings enable row level security;
alter table public.reviews enable row level security;

drop policy if exists "bookings_select_all" on public.bookings;
drop policy if exists "bookings_insert_all" on public.bookings;
drop policy if exists "bookings_update_all" on public.bookings;
drop policy if exists "bookings_delete_all" on public.bookings;
drop policy if exists "bookings_select_authenticated" on public.bookings;
drop policy if exists "bookings_select_admin_only" on public.bookings;
drop policy if exists "bookings_insert_public" on public.bookings;
drop policy if exists "bookings_update_authenticated" on public.bookings;
drop policy if exists "bookings_update_admin_only" on public.bookings;
drop policy if exists "bookings_delete_authenticated" on public.bookings;
drop policy if exists "bookings_delete_admin_only" on public.bookings;

drop policy if exists "reviews_select_all" on public.reviews;
drop policy if exists "reviews_insert_all" on public.reviews;
drop policy if exists "reviews_select_public" on public.reviews;
drop policy if exists "reviews_insert_public" on public.reviews;

-- 预约：仅白名单邮箱（登录态）可列表/改状态/删除；任何人可插入新预约
create policy "bookings_select_admin_only"
  on public.bookings for select
  to authenticated
  using (public.is_booking_admin());

create policy "bookings_insert_public"
  on public.bookings for insert
  to anon, authenticated
  with check (true);

create policy "bookings_update_admin_only"
  on public.bookings for update
  to authenticated
  using (public.is_booking_admin())
  with check (public.is_booking_admin());

create policy "bookings_delete_admin_only"
  on public.bookings for delete
  to authenticated
  using (public.is_booking_admin());

-- 评价：所有人可读、可发表；不提供 update/delete（防篡改/删他人评价需另做管理员策略）
create policy "reviews_select_public"
  on public.reviews for select
  to anon, authenticated
  using (true);

create policy "reviews_insert_public"
  on public.reviews for insert
  to anon, authenticated
  with check (true);
