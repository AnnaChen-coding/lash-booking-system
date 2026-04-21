-- 排班模型：美甲 / 美睫 各 2 技师；按「服务时长 + 缓冲」区间重叠校验容量。
-- 在 Supabase SQL Editor 执行（已有库在 migration_payment_flow 之后追加即可）。
-- 执行后请重新部署/刷新 PostgREST 缓存（Dashboard 通常自动）。

-- 1) 去掉「同一 date+time 全局唯一」，改为插入时在 RPC 内校验并发上限
drop index if exists public.bookings_one_active_per_slot;

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

-- 匿名：某日已占用区间（不含客户信息），供前端算可约时段
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

-- 插入前校验：同线路并发（区间重叠）不超过技师数
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
