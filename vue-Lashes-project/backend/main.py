"""
FastAPI 应用入口。

公开（匿名）：
- GET /booked-times?date=
- POST /bookings
- POST /auth/login
- GET /auth/me（需 Bearer，返回是否管理员）
- POST /bookings/{id}/confirm-payment（模拟支付：pending_payment → paid，无鉴权）
- POST /notifications/booking-success

需管理员 Bearer：
- GET /bookings
- PATCH /bookings/{id}/status
- DELETE /bookings/{id}
"""

import os
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import (
    Depends,
    FastAPI,
    Header,
    HTTPException,
    Query,
    status,
    Path as ApiPath,
)
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import and_
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from models import Booking
from schemas import (
    AuthLogin,
    AuthMeOut,
    AuthTokenOut,
    BookedTimesOut,
    BookingCreate,
    BookingNotifyOut,
    BookingNotifyPayload,
    BookingOut,
    BookingStatusPatch,
)
from security import (
    create_fastapi_access_token,
    get_email_from_bearer_token,
    is_admin_email,
    verify_admin_password,
)

# 从 backend/.env 加载环境变量（与前端 .env.local 中的 VITE_* 无关）
load_dotenv(Path(__file__).resolve().parent / ".env")

app = FastAPI(title="Lashes Booking API", version="0.1.0")

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


def _parse_bearer(authorization: Optional[str]) -> Optional[str]:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    return authorization.split(" ", 1)[1].strip() or None


def require_admin(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    db: Session = Depends(get_db),
) -> str:
    token = _parse_bearer(authorization)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
        )

    email = get_email_from_bearer_token(token)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    if not is_admin_email(db, email):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )

    return email


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)


@app.post("/auth/login", response_model=AuthTokenOut)
def auth_login(payload: AuthLogin, db: Session = Depends(get_db)):
    """
    管理员登录：邮箱须在 admin_emails 表或 ADMIN_EMAILS 环境变量中；
    口令为服务端 FASTAPI_ADMIN_PASSWORD。
    """
    jwt_secret = os.getenv("FASTAPI_JWT_SECRET", "")

    if len(jwt_secret) < 16:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="请在 backend/.env 设置 FASTAPI_JWT_SECRET（至少 16 个字符）后重启 uvicorn",
        )

    if not (os.getenv("FASTAPI_ADMIN_PASSWORD") or "").strip():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="请在 backend/.env 设置 FASTAPI_ADMIN_PASSWORD 后重启 uvicorn（与 Supabase 登录密码无关）",
        )

    if not is_admin_email(db, payload.email):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not verify_admin_password(payload.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    try:
        token = create_fastapi_access_token(payload.email)
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        ) from e

    return AuthTokenOut(access_token=token)


@app.get("/auth/me", response_model=AuthMeOut)
def auth_me(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    db: Session = Depends(get_db),
):
    token = _parse_bearer(authorization)

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
        )

    email = get_email_from_bearer_token(token)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    return AuthMeOut(email=email, isAdmin=is_admin_email(db, email))


@app.get("/bookings", response_model=List[BookingOut])
def get_bookings(
    _admin: str = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return db.query(Booking).order_by(Booking.id.asc()).all()


@app.get("/booked-times", response_model=BookedTimesOut)
def get_booked_times(
    date: str = Query(
        ...,
        min_length=1,
        max_length=32,
        description="与 bookings.date 一致，通常为 YYYY-MM-DD",
    ),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Booking.time)
        .filter(Booking.date == date, Booking.status != "cancelled")
        .order_by(Booking.time.asc())
        .all()
    )

    times = [row[0] for row in rows]

    return BookedTimesOut(date=date, times=times)


@app.post("/bookings", response_model=BookingOut, status_code=status.HTTP_201_CREATED)
def create_booking(payload: BookingCreate, db: Session = Depends(get_db)):
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
            detail="This time slot has already been booked.",
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


@app.post(
    "/bookings/{booking_id}/confirm-payment",
    response_model=BookingOut,
)
def confirm_payment_simulation(
    booking_id: int = ApiPath(..., gt=0),
    db: Session = Depends(get_db),
):
    """
    模拟支付回调：匿名将 pending_payment 置为 paid（与 Supabase RPC 语义对齐）。
    不提供鉴权，仅允许该状态迁移，避免任意改单。
    """
    booking = db.get(Booking, booking_id)

    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found.",
        )

    if booking.status != "pending_payment":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Order is not in pending_payment status.",
        )

    booking.status = "paid"
    db.commit()
    db.refresh(booking)

    return booking


@app.delete("/bookings/{booking_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_booking(
    booking_id: int = ApiPath(..., gt=0),
    _admin: str = Depends(require_admin),
    db: Session = Depends(get_db),
):
    booking = db.get(Booking, booking_id)

    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found.",
        )

    db.delete(booking)
    db.commit()

    return None


@app.patch("/bookings/{booking_id}/status", response_model=BookingOut)
def patch_booking_status(
    payload: BookingStatusPatch,
    booking_id: int = ApiPath(..., gt=0),
    _admin: str = Depends(require_admin),
    db: Session = Depends(get_db),
):
    booking = db.get(Booking, booking_id)

    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found.",
        )

    booking.status = payload.status
    db.commit()
    db.refresh(booking)

    return booking


@app.post("/notifications/booking-success", response_model=BookingNotifyOut)
def notify_booking_success(payload: BookingNotifyPayload):
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