from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from backend.core.config import settings

# Convert postgres:// to postgresql:// for SQLAlchemy
DATABASE_URL = settings.DATABASE_URL
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from backend import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    # Safe migrations: add columns that may not exist on older deployments
    _run_migrations()


def _run_migrations():
    """Apply incremental schema changes that create_all won't handle."""
    from sqlalchemy import text, inspect
    insp = inspect(engine)
    with engine.begin() as conn:
        # Add meeting_id to tasks if missing
        task_cols = [c["name"] for c in insp.get_columns("tasks")]
        if "meeting_id" not in task_cols:
            conn.execute(text(
                "ALTER TABLE tasks ADD COLUMN meeting_id INTEGER REFERENCES meetings(id) ON DELETE SET NULL"
            ))
