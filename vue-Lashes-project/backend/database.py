"""
数据库连接与会话管理。

使用 SQLite 作为最小可运行存储，便于本地演示与面试讲解。
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# SQLite 数据库文件放在 backend 目录下，便于项目打包展示。
DATABASE_URL = "sqlite:///./app.db"

# SQLite 需要关闭同线程检查，FastAPI 多请求场景才可稳定访问。
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)

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
