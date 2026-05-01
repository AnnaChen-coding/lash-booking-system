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
    status in (
      'pending',
      'confirmed',
      'cancelled',
      'pending_payment',
      'paid'
    )
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

-- 容量与区间重叠由 insert_booking_anon（见下）校验；不再对 (date, time) 建全局唯一索引。
-- 从旧库升级：在 SQL Editor 执行本文件全文（含 drop function / drop policy 等），可先备份数据。

-- 匿名可调用：返回某日已被占用的时间段（不含客户姓名电话）
-- 若历史上建过 (date) 重载，会与 (text) 并存导致 PostgREST 报错；先删掉 date 版。
drop function if exists public.get_booked_times_for_date(date);

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

create or replace function public.time_to_minutes(t text)
returns integer
language sql
immutable
as $$
  select (split_part(t, ':', 1)::integer * 60 + split_part(t, ':', 2)::integer);
$$;

revoke all on function public.time_to_minutes(text) from public;
grant execute on function public.time_to_minutes(text) to anon, authenticated;

create or replace function public.booking_schedule_line(p_service text)
returns text
language sql
immutable
as $$
  select case
    when p_service in ('Classic Manicure', 'Gel Manicure', 'Nail Extension') then 'nails'
    when p_service in (
      'Classic Lash Extensions',
      'Hybrid Lash Extensions',
      'Lash Lift'
    ) then 'lashes'
    else 'lashes'
  end;
$$;

revoke all on function public.booking_schedule_line(text) from public;
grant execute on function public.booking_schedule_line(text) to anon, authenticated;

create or replace function public.booking_block_minutes(p_service text)
returns integer
language sql
immutable
as $$
  select case public.booking_schedule_line(p_service)
    when 'nails' then 100
    else 70
  end;
$$;

revoke all on function public.booking_block_minutes(text) from public;
grant execute on function public.booking_block_minutes(text) to anon, authenticated;

-- 若历史上建过 (date) 重载，会与 (text) 并存导致 PostgREST 报错；先删掉 date 版。
drop function if exists public.get_public_booking_blocks_for_date(date);

create or replace function public.get_public_booking_blocks_for_date(p_date text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'line', public.booking_schedule_line(service),
        'time', time,
        'blockMinutes', public.booking_block_minutes(service)
      )
      order by time
    ),
    '[]'::jsonb
  )
  from public.bookings
  where date = p_date
    and status <> 'cancelled';
$$;

revoke all on function public.get_public_booking_blocks_for_date(text) from public;
grant execute on function public.get_public_booking_blocks_for_date(text)
  to anon, authenticated;

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

-- 匿名插入预约并返回自增 id（支付流程依赖真实 orderId；直连 insert 无法 select）
-- 若历史上建过 p_date 为 date 的重载，会与 (text) 并存导致 PostgREST 歧义；先删掉 date 版。
drop function if exists public.insert_booking_anon(text, text, text, date, text, text, text);

create or replace function public.insert_booking_anon(
  p_name text,
  p_phone text,
  p_service text,
  p_date text,
  p_time text,
  p_notes text,
  p_status text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id integer;
  v_line text;
  v_block int;
  v_start int;
  v_new_end int;
  v_max int;
begin
  v_line := public.booking_schedule_line(p_service);
  v_block := public.booking_block_minutes(p_service);
  v_start := public.time_to_minutes(p_time);
  v_new_end := v_start + v_block;

  with ev as (
    select public.time_to_minutes(b.time) as t, 1 as d
    from public.bookings b
    where b.date = p_date
      and b.status <> 'cancelled'
      and public.booking_schedule_line(b.service) = v_line
    union all
    select public.time_to_minutes(b.time) + public.booking_block_minutes(b.service), -1
    from public.bookings b
    where b.date = p_date
      and b.status <> 'cancelled'
      and public.booking_schedule_line(b.service) = v_line
    union all
    select v_start, 1
    union all
    select v_new_end, -1
  ),
  ordered as (
    select t, d
    from ev
    order by t asc, d asc
  ),
  runs as (
    select sum(d) over (order by t asc, d asc) as run
    from ordered
  )
  select coalesce(max(run), 0)
  into v_max
  from runs;

  if v_max > 2 then
    raise exception '该时段刚刚已被预约，请另选时间'
      using errcode = '23505';
  end if;

  insert into public.bookings (name, phone, service, date, time, notes, status)
  values (
    p_name,
    p_phone,
    p_service,
    p_date,
    p_time,
    coalesce(p_notes, ''),
    p_status
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.insert_booking_anon(
  text, text, text, text, text, text, text
) from public;
grant execute on function public.insert_booking_anon(
  text, text, text, text, text, text, text
) to anon, authenticated;

-- 模拟支付异步通知：仅允许 pending_payment -> paid（anonymous 无表 UPDATE 权限）
create or replace function public.confirm_booking_payment_simulation(p_id integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.bookings
  set status = 'paid'
  where id = p_id
    and status = 'pending_payment';
end;
$$;

revoke all on function public.confirm_booking_payment_simulation(integer) from public;
grant execute on function public.confirm_booking_payment_simulation(integer)
  to anon, authenticated;
