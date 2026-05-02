"""
FastAPI 应用入口。

提供最小预约 REST API：
- GET /bookings
- POST /bookings
- DELETE /bookings/{id}
- PATCH /bookings/{id}/status
"""

from typing import List

from fastapi import Depends, FastAPI, HTTPException, Path, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import and_
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from models import Booking
from schemas import (
    BookingCreate,
    BookingNotifyOut,
    BookingNotifyPayload,
    BookingOut,
    BookingStatusPatch,
)

app = FastAPI(title="Lashes Booking API", version="0.1.0")

# 本地开发 CORS：允许 Vue Vite 默认地址访问。
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    """
    启动时自动建表，确保首次运行即可使用。
    """
    Base.metadata.create_all(bind=engine)


@app.get("/bookings", response_model=List[BookingOut])
def get_bookings(db: Session = Depends(get_db)):
    """
    获取所有预约，按 id 倒序（最新在前）。
    """
    return db.query(Booking).order_by(Booking.id.desc()).all()


@app.post("/bookings", response_model=BookingOut, status_code=status.HTTP_201_CREATED)
def create_booking(payload: BookingCreate, db: Session = Depends(get_db)):
    """
    创建预约，并做时间冲突校验：
    同一天同一时间，若已有非 cancelled 预约，则拒绝创建。
    """
    conflict = (
        db.query(Booking)
        .filter(
            and_(
                Booking.date == payload.date,
                Booking.time == payload.time,
                Booking.status != "cancelled",
            )
        )
        .first()
    )
    if conflict:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This time slot is already booked.",
        )

    booking = Booking(
        name=payload.name,
        phone=payload.phone,
        service=payload.service,
        date=payload.date,
        time=payload.time,
        notes=payload.notes,
        status=payload.status,
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking


@app.delete("/bookings/{booking_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_booking(
    booking_id: int = Path(..., gt=0), db: Session = Depends(get_db)
):
    """
    删除预约，不存在时返回 404。
    """
    booking = db.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found.")
    db.delete(booking)
    db.commit()
    return None


@app.patch("/bookings/{booking_id}/status", response_model=BookingOut)
def patch_booking_status(
    payload: BookingStatusPatch,
    booking_id: int = Path(..., gt=0),
    db: Session = Depends(get_db),
):
    """
    更新预约状态（如 confirmed / cancelled）。
    """
    booking = db.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found.")

    booking.status = payload.status
    db.commit()
    db.refresh(booking)
    return booking


@app.post("/notifications/booking-success", response_model=BookingNotifyOut)
def notify_booking_success(payload: BookingNotifyPayload):
    """
    预约成功通知入口（最小可联调实现）。
    当前仅记录日志并返回成功，后续可接入真实邮件/短信通道。
    """
    print(
        "[booking-notify:fastapi]",
        {
            "booking_id": payload.booking.id,
            "customer_name": payload.customerName,
            "customer_phone": payload.customerPhone,
            "customer_email": payload.customerEmail,
            "service": payload.service,
            "date": payload.date,
            "time": payload.time,
        },
    )
    return BookingNotifyOut()
