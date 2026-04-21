-- 已有项目：在 Supabase → SQL Editor 一次性执行本脚本（新库可直接用 schema.sql 全量脚本）
-- 1) 扩展 status 枚举  2) 模拟支付回调更新状态
--
-- insert_booking_anon（匿名插入 + 容量校验）以 schema.sql 或 migration_schedule_model.sql 为准；
-- 请勿在本文件内再次定义该函数，否则会覆盖排班迁移中的实现。

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
