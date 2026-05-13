"""
数据库连接与会话管理。

默认使用 SQLite（零配置），也支持通过 DATABASE_URL 连接 PostgreSQL。

与 Supabase 同一套数据时：在 Supabase Dashboard → Project Settings → Database
复制连接串，并改为 SQLAlchemy + psycopg2 形式，例如：

  postgresql+psycopg2://postgres.[project-ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres

表结构须与仓库根目录 supabase/schema.sql 中 public.bookings 一致（可先在该项目执行 schema.sql）。
"""

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# 优先使用环境变量 DATABASE_URL；未配置时回退到本地 SQLite（仅本地演示库，非 Supabase）。
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")

# 仅 SQLite 需要 check_same_thread=False；PostgreSQL 等不需要。
engine_kwargs = {}
if DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, **engine_kwargs)

# 统一会话工厂：关闭自动提交，显式 commit 更清晰。
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 所有 ORM 模型的基类。
Base = declarative_base()


def get_db():
    """
    FastAPI 依赖注入：为每个请求提供一个数据库会话，并在请求后自动关闭。
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
