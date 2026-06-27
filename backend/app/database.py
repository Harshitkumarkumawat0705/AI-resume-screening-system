import os
from typing import Generator
from sqlmodel import SQLModel, Session, create_engine
import sqlalchemy.exc

# Database connection URL for local PostgreSQL database (supports environment overrides)
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/resume_rms")

# Default global engine variable (will be replaced if PostgreSQL fails)
engine = create_engine(DATABASE_URL, echo=True)

def get_session() -> Generator[Session, None, None]:
    """
    FastAPI dependency injection helper to yield a database session.
    Ensures the session is properly closed after a request is completed.
    """
    # Use dynamic access to the global engine variable
    with Session(engine) as session:
        yield session

def init_db() -> None:
    """
    Initializes the database by creating all tables defined in SQLModel metadata.
    Falls back to SQLite if PostgreSQL connection fails.
    """
    global engine
    try:
        # Test connection to PostgreSQL database
        with engine.connect() as conn:
            pass
        SQLModel.metadata.create_all(engine)
        run_migrations(engine)
        print("Successfully connected and initialized PostgreSQL database.")
    except Exception as e:
        # Fall back to local SQLite file
        print(f"PostgreSQL connection failed: {e}. Falling back to SQLite...")
        sqlite_url = "sqlite:///resume_rms.db"
        # check_same_thread=False is needed for SQLite to run in multithreaded FastAPI context
        engine = create_engine(sqlite_url, echo=True, connect_args={"check_same_thread": False})
        SQLModel.metadata.create_all(engine)
        run_migrations(engine)
        print("Successfully initialized SQLite database fallback (resume_rms.db).")

def run_migrations(db_engine) -> None:
    """
    Safely executes DDL migrations to add columns to existing tables.
    """
    from sqlalchemy import text
    
    # Run each migration in a separate transaction connection
    with db_engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE application ADD COLUMN resume_path VARCHAR;"))
            conn.commit()
            print("Successfully migrated: Added resume_path column to application table.")
        except Exception as e:
            # Column already exists, or table does not exist yet (will be created by create_all)
            print(f"Migration fallback or skipped for resume_path: {e}")

    with db_engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE job ADD COLUMN owner_id INTEGER;"))
            conn.commit()
            print("Successfully migrated: Added owner_id column to job table.")
        except Exception as e:
            # Column already exists, or table does not exist yet (will be created by create_all)
            print(f"Migration fallback or skipped for owner_id: {e}")

