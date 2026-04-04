-- 已有数据库时：在 SQL Editor 执行（可重复执行）
-- 1) 建白名单表  2) 替换预约相关 RLS 为「仅白名单管理员」
-- 执行后务必：insert into public.admin_emails (email) values ('你的邮箱@域名');

create table if not exists public.admin_emails (
  email text primary key
);

alter table public.admin_emails disable row level security;
revoke all on public.admin_emails from public;
grant select, insert, update, delete on public.admin_emails to service_role;

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

drop policy if exists "bookings_select_authenticated" on public.bookings;
drop policy if exists "bookings_select_admin_only" on public.bookings;
drop policy if exists "bookings_update_authenticated" on public.bookings;
drop policy if exists "bookings_update_admin_only" on public.bookings;
drop policy if exists "bookings_delete_authenticated" on public.bookings;
drop policy if exists "bookings_delete_admin_only" on public.bookings;

create policy "bookings_select_admin_only"
  on public.bookings for select
  to authenticated
  using (public.is_booking_admin());

create policy "bookings_update_admin_only"
  on public.bookings for update
  to authenticated
  using (public.is_booking_admin())
  with check (public.is_booking_admin());

create policy "bookings_delete_admin_only"
  on public.bookings for delete
  to authenticated
  using (public.is_booking_admin());
