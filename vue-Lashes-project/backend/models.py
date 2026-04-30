"""
SQLAlchemy ORM 模型定义。
"""

from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class Booking(Base):
    """
    预约表：用于存储前端提交的预约信息。
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
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
