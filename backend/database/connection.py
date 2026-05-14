import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
import os
from dotenv import load_dotenv
import logging
from contextlib import asynccontextmanager
from functools import lru_cache
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorCollection
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

_client: AsyncIOMotorClient | None = None


def _settings() -> Settings:
    from functools import lru_cache as _lru
    # avoid circular import — inline import
    return Settings()


@asynccontextmanager
async def db_lifespan():
    """Call inside FastAPI lifespan to open/close the Motor connection."""
    global _client
    settings = _settings()
    _client  = AsyncIOMotorClient(
        settings.MONGO_URI,
        maxPoolSize       = 50,
        minPoolSize       = 5,
        serverSelectionTimeoutMS = 5_000,
    )
    log.info("✅ MongoDB (Motor) connected")

    # Ensure indexes
    col = _client["whatsapp-automation"]["flow_leads"]
    await col.create_index("wa_message_id", unique=True, sparse=True)
    await col.create_index("flow_token")
    log.info("✅ MongoDB indexes ready")

    yield   # app runs here

    _client.close()
    log.info("🛑 MongoDB connection closed")


def leads_col() -> AsyncIOMotorCollection:
    """Return the flow_leads collection. Must be called after lifespan startup."""
    if _client is None:
        raise RuntimeError("MongoDB not connected — check lifespan setup")
    return _client["whatsapp-automation"]["flow_leads"]
