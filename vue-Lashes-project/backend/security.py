"""
JWT 签发与校验、管理员邮箱判定。

- FastAPI 自签 JWT：HS256，密钥 FASTAPI_JWT_SECRET（仅服务端）。
- 可选：校验 Supabase access_token（SUPABASE_JWT_SECRET，Dashboard → JWT Settings）。
- 管理员名单：优先查 public.admin_emails；可辅以环境变量 ADMIN_EMAILS（逗号分隔）。
- 登录口令：FASTAPI_ADMIN_PASSWORD（仅服务端，勿提交到前端仓库）。
"""

from __future__ import annotations

import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import jwt
from sqlalchemy import func
from sqlalchemy.orm import Session

from models import AdminEmail

FASTAPI_JWT_ALG = "HS256"
FASTAPI_JWT_ISS = "lashes-fastapi"
FASTAPI_JWT_EXP_HOURS = 24


def _admin_emails_from_env() -> set[str]:
    raw = os.getenv("ADMIN_EMAILS", "") or ""
    return {x.strip().lower() for x in raw.split(",") if x.strip()}


def is_admin_email(db: Session, email: str) -> bool:
    e = email.strip().lower()
    if not e:
        return False
    row = (
        db.query(AdminEmail)
        .filter(func.lower(AdminEmail.email) == e)
        .first()
    )
    if row is not None:
        return True
    return e in _admin_emails_from_env()


def verify_admin_password(password: str) -> bool:
    expected = os.getenv("FASTAPI_ADMIN_PASSWORD", "")
    if not expected:
        return False
    return secrets.compare_digest(password, expected)


def create_fastapi_access_token(email: str) -> str:
    secret = os.getenv("FASTAPI_JWT_SECRET", "")
    if len(secret) < 16:
        raise RuntimeError(
            "FASTAPI_JWT_SECRET must be set to a strong secret (>= 16 chars) for /auth/login"
        )
    now = datetime.now(timezone.utc)
    payload = {
        "sub": email.strip().lower(),
        "iss": FASTAPI_JWT_ISS,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=FASTAPI_JWT_EXP_HOURS)).timestamp()),
    }
    return jwt.encode(payload, secret, algorithm=FASTAPI_JWT_ALG)


def _decode_fastapi_token(token: str) -> Optional[dict[str, Any]]:
    secret = os.getenv("FASTAPI_JWT_SECRET", "")
    if not secret:
        return None
    try:
        return jwt.decode(
            token,
            secret,
            algorithms=[FASTAPI_JWT_ALG],
            issuer=FASTAPI_JWT_ISS,
            options={"require": ["exp", "iat", "sub"]},
        )
    except jwt.PyJWTError:
        return None


def _decode_supabase_token(token: str) -> Optional[dict[str, Any]]:
    secret = os.getenv("SUPABASE_JWT_SECRET", "").strip()
    if not secret:
        return None
    try:
        # Supabase 用户 JWT 通常为 aud=authenticated
        return jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            audience="authenticated",
            options={"verify_aud": True},
        )
    except jwt.PyJWTError:
        try:
            return jwt.decode(
                token,
                secret,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
        except jwt.PyJWTError:
            return None


def get_email_from_bearer_token(token: str) -> Optional[str]:
    """
    依次尝试 FastAPI 自签 JWT、Supabase access_token，解析出邮箱。
    """
    if not token or not token.strip():
        return None
    t = token.strip()
    p = _decode_fastapi_token(t)
    if p and isinstance(p.get("sub"), str):
        return p["sub"].strip().lower()
    s = _decode_supabase_token(t)
    if s:
        em = s.get("email")
        if isinstance(em, str) and em.strip():
            return em.strip().lower()
    return None
