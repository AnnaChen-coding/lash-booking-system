-- 若你曾执行过「所有人可读写」的旧版策略，在 SQL Editor 中运行本文件，再运行 schema.sql 里从
-- 「create unique index if not exists bookings_one_active_per_slot」起的段落（或整份 schema.sql，
-- 其中 create table / policy 多为 IF NOT EXISTS / DROP IF EXISTS，可重复执行）。
--
-- 若建唯一索引时报错，说明已有「同一天同一时段多条未取消记录」，需先在 Table Editor 里手动整理数据。

drop policy if exists "bookings_select_all" on public.bookings;
drop policy if exists "bookings_insert_all" on public.bookings;
drop policy if exists "bookings_update_all" on public.bookings;
drop policy if exists "bookings_delete_all" on public.bookings;

drop policy if exists "reviews_select_all" on public.reviews;
drop policy if exists "reviews_insert_all" on public.reviews;
