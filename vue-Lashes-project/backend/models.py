"""
SQLAlchemy ORM 模型定义。

与仓库内 supabase/schema.sql 中 public.bookings / public.admin_emails 对齐。
"""

from sqlalchemy import Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class Booking(Base):
    """
    预约表：与 Supabase public.bookings 同一套结构（可连 Supabase Postgres 或本地 SQLite）。
    """

    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str] = mapped_column(String(30), nullable=False)
    service: Mapped[str] = mapped_column(String(120), nullable=False)
    date: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    time: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    notes: Mapped[str] = mapped_column(Text, default="", nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="pending", nullable=False)


class AdminEmail(Base):
    """与 schema.sql 中 public.admin_emails 一致（仅 email 主键）。"""

    __tablename__ = "admin_emails"

    email: Mapped[str] = mapped_column(String(255), primary_key=True)
