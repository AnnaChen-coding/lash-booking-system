-- 已有项目：在 Supabase → SQL Editor 一次性执行本脚本（新库可直接用 schema.sql 全量脚本）
-- 1) 扩展 status 枚举  2) 匿名插入返回 id  3) 模拟支付回调更新状态

alter table public.bookings drop constraint if exists bookings_status_check;

alter table public.bookings add constraint bookings_status_check check (
  status in (
    'pending',
    'confirmed',
    'cancelled',
    'pending_payment',
    'paid'
  )
);

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
begin
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
