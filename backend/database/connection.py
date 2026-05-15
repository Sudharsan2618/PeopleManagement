import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
import os
from dotenv import load_dotenv
import logging
from contextlib import asynccontextmanager
from config import Settings

# Load environment variables
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

# Connection Pool instance
_pool = None

def init_pool():
    """Initialize the global connection pool."""
    global _pool
    if _pool is None:
        try:
            _pool = pool.ThreadedConnectionPool(
                minconn=1,
                maxconn=20, # Adjust based on Render DB limits
                **DB_CONFIG
            )
            logging.info("✅ PostgreSQL Connection Pool initialized")
        except Exception as e:
            logging.error(f"❌ Failed to initialize PostgreSQL Pool: {e}")
            raise e

def close_pool():
    """Close the global connection pool."""
    global _pool
    if _pool:
        _pool.closeall()
        logging.info("🛑 PostgreSQL Connection Pool closed")

def get_connection():
    """Get a connection from the pool."""
    if _pool is None:
        init_pool()
    return _pool.getconn()

def put_connection(conn):
    """Return a connection to the pool."""
    if _pool and conn:
        _pool.putconn(conn)

@contextmanager
def get_db_cursor():
    """Context manager for database cursor using the connection pool."""
    conn = get_connection()
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        yield cursor
        conn.commit()
    except Exception as e:
        conn.rollback()
        logging.error(f"❌ Database error: {e}")
        raise e
    finally:
        cursor.close()
        put_connection(conn)


def execute_query(query: str, params: tuple = None, fetch: str = "all"):
    """Execute a SQL query and return results."""
    try:
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
    except Exception as e:
        logging.error(f"❌ Query execution failed: {query} | Error: {e}")
        raise e


def execute_insert(query: str, params: tuple = None):
    """Execute an INSERT query and return the inserted row ID."""
    try:
        with get_db_cursor() as cursor:
            cursor.execute(query, params or ())
            res = cursor.fetchone()
            return res['id'] if res else None
    except Exception as e:
        logging.error(f"❌ Insert execution failed: {query} | Error: {e}")
        raise e


def execute_update_delete(query: str, params: tuple = None):
    """Execute an UPDATE or DELETE query and return affected row count."""
    try:
        with get_db_cursor() as cursor:
            cursor.execute(query, params or ())
            return cursor.rowcount
    except Exception as e:
        logging.error(f"❌ Update/Delete execution failed: {query} | Error: {e}")
        raise e

log = logging.getLogger(__name__)

@asynccontextmanager
async def db_lifespan():
    """App lifespan: database initialization."""
    try:
        init_pool()
        log.info("✅ PostgreSQL connection pool ready")
        yield
    finally:
        close_pool()
        log.info("🛑 App shutting down")
