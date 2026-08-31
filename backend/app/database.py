from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import psycopg2
import psycopg2.extras
from app.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_raw_connection():
    """Returns a raw psycopg2 connection for raw SQL execution and EXPLAIN ANALYZE"""
    conn = psycopg2.connect(
        dbname=settings.POSTGRES_DB,
        user=settings.POSTGRES_USER,
        password=settings.POSTGRES_PASSWORD,
        host=settings.POSTGRES_HOST,
        port=settings.POSTGRES_PORT
    )
    conn.autocommit = True
    return conn
