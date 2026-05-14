import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
import os
from dotenv import load_dotenv
import logging
from contextlib import asynccontextmanager
from functools import lru_cache
from config import Settings

# Load environment variables from .env file
load_dotenv()

# Database configuration
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": os.getenv("DB_PORT", "5432"),
    "database": os.getenv("DB_NAME", "course_enrollment"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "password"),
    "options": "-c timezone=Asia/Kolkata"
}


def get_connection():
    """Create and return a new database connection."""
    return psycopg2.connect(**DB_CONFIG)


@contextmanager
def get_db_cursor():
    """Context manager for database cursor with automatic cleanup."""
    conn = get_connection()
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        yield cursor
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()


def execute_query(query: str, params: tuple = None, fetch: str = "all"):
    """
    Execute a SQL query and return results.
    
    Args:
        query: SQL query string
        params: Optional tuple of parameters for parameterized query
        fetch: 'all' for all rows, 'one' for single row, None for no fetch
    
    Returns:
        Query results based on fetch parameter
    """
    with get_db_cursor() as cursor:
        cursor.execute(query, params or ())
        
        if fetch == "all":
            return cursor.fetchall()
        elif fetch == "one":
            return cursor.fetchone()
        elif fetch == "none":
            return None
        else:
            raise ValueError(f"Invalid fetch parameter: {fetch}")


def execute_insert(query: str, params: tuple = None):
    """
    Execute an INSERT query and return the inserted row ID.
    
    Args:
        query: SQL INSERT query string
        params: Tuple of parameters for parameterized query
    
    Returns:
        ID of the inserted row
    """
    with get_db_cursor() as cursor:
        cursor.execute(query, params or ())
        return cursor.fetchone()['id'] if cursor.rowcount > 0 else None


def execute_update_delete(query: str, params: tuple = None):
    """
    Execute an UPDATE or DELETE query and return affected row count.
    
    Args:
        query: SQL UPDATE or DELETE query string
        params: Tuple of parameters for parameterized query
    
    Returns:
        Number of affected rows
    """
    with get_db_cursor() as cursor:
        cursor.execute(query, params or ())
        return cursor.rowcount

log = logging.getLogger(__name__)

def _settings() -> Settings:
    # avoid circular import — inline import
    return Settings()


@asynccontextmanager
async def db_lifespan():
    """App lifespan: database initialization."""
    log.info("✅ PostgreSQL connection verified")
    yield   # app runs here
    log.info("🛑 App shutting down")
