from sqlalchemy.ext.asyncio import create_async_engine, AsyncEngine
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker
from app.config import settings

ENGINE: AsyncEngine = None
SessionLocal: sessionmaker = None


def init_db():
    global ENGINE, SessionLocal
    db_url = settings.DATABASE_URL
    if not db_url:
        user = settings.POSTGRES_USER or ""
        pwd = settings.POSTGRES_PASSWORD or ""
        host = settings.POSTGRES_HOST or "localhost"
        port = settings.POSTGRES_PORT or 5432
        db = settings.POSTGRES_DB or "postgres"
        db_url = f"postgresql+asyncpg://{user}:{pwd}@{host}:{port}/{db}"

    ENGINE = create_async_engine(db_url, echo=False, future=True)
    SessionLocal = sessionmaker(ENGINE, expire_on_commit=False, class_=AsyncSession)


async def get_session() -> AsyncSession:
    if SessionLocal is None:
        init_db()
    async with SessionLocal() as session:
        yield session
