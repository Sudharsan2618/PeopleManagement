import time
import psycopg2
from psycopg2 import pool, OperationalError
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

# ── Pool tuning ───────────────────────────────────────────────────────────────
POOL_MIN_CONN = 2          # Keep 2 warm connections ready at all times
POOL_MAX_CONN = 30         # Max concurrent connections per Cloud Run instance
POOL_RETRY_ATTEMPTS = 5    # How many times to retry on pool exhaustion
POOL_RETRY_DELAY = 0.3     # Seconds to wait between retries (increases with backoff)

# Connection Pool instance
_pool = None

log = logging.getLogger(__name__)


def init_pool():
    """Initialize the global connection pool."""
    global _pool
    if _pool is None:
        try:
            _pool = pool.ThreadedConnectionPool(
                minconn=POOL_MIN_CONN,
                maxconn=POOL_MAX_CONN,
                **DB_CONFIG
            )
            log.info(
                "✅ PostgreSQL Connection Pool initialized "
                "(min=%d, max=%d)", POOL_MIN_CONN, POOL_MAX_CONN
            )
        except Exception as e:
            log.error(f"❌ Failed to initialize PostgreSQL Pool: {e}")
            raise e

def close_pool():
    """Close the global connection pool."""
    global _pool
    if _pool:
        _pool.closeall()
        _pool = None
        log.info("🛑 PostgreSQL Connection Pool closed")

def get_connection():
    """
    Get a connection from the pool with retry + backoff.
    
    psycopg2's ThreadedConnectionPool raises PoolError immediately when
    exhausted. This wrapper retries a few times with exponential backoff
    so that burst traffic (e.g. dashboard loading 6 endpoints at once)
    can wait for a connection to free up instead of failing.
    """
    if _pool is None:
        init_pool()
    
    last_error = None
    for attempt in range(1, POOL_RETRY_ATTEMPTS + 1):
        try:
            conn = _pool.getconn()
            # Validate the connection is still alive (handles server restarts)
            try:
                conn.isolation_level  # lightweight check
                if conn.closed:
                    raise OperationalError("connection closed")
            except (OperationalError, psycopg2.InterfaceError):
                # Connection is dead — discard and get a fresh one
                try:
                    _pool.putconn(conn, close=True)
                except Exception:
                    pass
                log.warning("♻️  Discarded stale connection, retrying...")
                continue
            return conn
        except pool.PoolError as e:
            last_error = e
            if attempt < POOL_RETRY_ATTEMPTS:
                delay = POOL_RETRY_DELAY * attempt  # linear backoff: 0.3, 0.6, 0.9, 1.2, 1.5s
                log.warning(
                    "⏳ Connection pool exhausted (attempt %d/%d), "
                    "retrying in %.1fs...",
                    attempt, POOL_RETRY_ATTEMPTS, delay
                )
                time.sleep(delay)
            else:
                log.error(
                    "❌ Connection pool exhausted after %d attempts", 
                    POOL_RETRY_ATTEMPTS
                )
                raise e
    raise last_error  # Should not reach here, but just in case

def put_connection(conn):
    """Return a connection to the pool."""
    if _pool and conn:
        try:
            _pool.putconn(conn)
        except Exception as e:
            # If putconn fails (e.g. pool closed), just close the connection
            log.warning(f"⚠️  Failed to return connection to pool: {e}")
            try:
                conn.close()
            except Exception:
                pass

@contextmanager
def get_db_cursor():
    """Context manager for database cursor using the connection pool."""
    conn = get_connection()
    cursor = None
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        yield cursor
        conn.commit()
    except Exception as e:
        conn.rollback()
        logging.error(f"❌ Database error: {e}")
        raise e
    finally:
        if cursor is not None:
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
        logging.error(f"❌ Query execution failed:\n{query}\n| Error: {e}")
        raise e


def execute_insert(query: str, params: tuple = None):
    """Execute an INSERT query and return the inserted row ID."""
    try:
        with get_db_cursor() as cursor:
            cursor.execute(query, params or ())
            res = cursor.fetchone()
            return res['id'] if res else None
    except Exception as e:
        logging.error(f"❌ Insert execution failed:\n{query}\n| Error: {e}")
        raise e


def execute_update_delete(query: str, params: tuple = None):
    """Execute an UPDATE or DELETE query and return affected row count."""
    try:
        with get_db_cursor() as cursor:
            cursor.execute(query, params or ())
            return cursor.rowcount
    except Exception as e:
        logging.error(f"❌ Update/Delete execution failed:\n{query}\n| Error: {e}")
        raise e


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
