"""
Pydantic 数据模型：约束请求体和响应体结构。

BookingOut 的 JSON 字段与前端 src/types/booking.ts 的 BookingItem 一致：
id, name, phone, service, date, time, notes, status（不含 created_at）。
"""

from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

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
    前端可能附带临时 id 等字段，一律忽略。
    """

    model_config = ConfigDict(extra="ignore")


class BookingOut(BookingBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class BookedTimesOut(BaseModel):
    """
    与前端匿名占档约定一致：某日已占用开始时间列表（不含客户信息）。
    语义对齐 supabase/schema.sql 中 get_booked_times_for_date。
    """

    date: str
    times: list[str]


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


class AuthLogin(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=1, max_length=500)


class AuthTokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AuthMeOut(BaseModel):
    email: str
    isAdmin: bool
