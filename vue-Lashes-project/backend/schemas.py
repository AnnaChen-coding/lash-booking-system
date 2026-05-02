"""
Pydantic 数据模型：约束请求体和响应体结构。
"""

from datetime import datetime
from typing import Literal, Optional

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


class BookingNotifyPayload(BaseModel):
    """
    预约成功通知请求体（与前端 dispatchBookingSuccessNotification 对齐）。
    """

    customerName: str = Field(..., min_length=1, max_length=100)
    customerPhone: str = Field(..., min_length=1, max_length=30)
    customerEmail: Optional[str] = Field(default=None, max_length=200)
    service: str = Field(..., min_length=1, max_length=120)
    date: str = Field(..., min_length=1, max_length=20)
    time: str = Field(..., min_length=1, max_length=20)
    notes: str = Field(default="", max_length=1000)
    booking: BookingOut


class BookingNotifyOut(BaseModel):
    """
    通知接口响应体：先返回 mock 成功，后续可替换为真实邮件/短信服务。
    """

    ok: bool = True
    provider: str = "fastapi_mock"
    message: str = "Booking notification accepted."
