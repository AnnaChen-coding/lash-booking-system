"""
Pydantic 数据模型：约束请求体和响应体结构。
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

BookingStatus = Literal[
    "pending",
    "confirmed",
    "cancelled",
    "pending_payment",
    "paid",
]


class BookingBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    phone: str = Field(..., min_length=1, max_length=30)
    service: str = Field(..., min_length=1, max_length=120)
    date: str = Field(..., min_length=1, max_length=20)
    time: str = Field(..., min_length=1, max_length=20)
    notes: str = Field(default="", max_length=1000)
    status: BookingStatus = "pending"


class BookingCreate(BookingBase):
    """
    创建预约请求体。当前与 BookingBase 一致，后续可独立扩展。
    """


class BookingOut(BookingBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class BookingStatusPatch(BaseModel):
    """
    仅用于 PATCH 状态更新，避免误改其他字段。
    """

    status: BookingStatus
