import logging
import threading
import psycopg2
from psycopg2 import pool, OperationalError
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager, asynccontextmanager
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

log = logging.getLogger(__name__)

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
POOL_MIN_CONN = 2
POOL_MAX_CONN = 20


# ── Safe Connection Pool ─────────────────────────────────────────────────────
# psycopg2's ThreadedConnectionPool tracks connections by thread ID in a _used
# dict. If code calls conn.close() directly (instead of pool.putconn()), the
# connection is destroyed but the pool slot stays permanently marked as "used".
# This class wraps the pool to prevent that leak.

class SafeConnectionPool:
    """
    Wrapper around ThreadedConnectionPool that tracks connections by object id
    instead of relying on thread identity. This prevents connection leaks when
    conn.close() is called directly instead of pool.putconn().
    """

    def __init__(self, minconn, maxconn, **kwargs):
        self._lock = threading.Lock()
        self._inner = pool.ThreadedConnectionPool(minconn, maxconn, **kwargs)
        # Track: conn_id -> conn  (so we can find connections regardless of thread)
        self._checked_out = {}

    def getconn(self):
        """Get a connection from the pool."""
        with self._lock:
            # First, clean out any connections that were closed behind our back
            dead_keys = [k for k, v in self._checked_out.items() if v.closed]
            for k in dead_keys:
                conn = self._checked_out.pop(k)
                # Tell the inner pool to forget about this connection
                try:
                    self._inner.putconn(conn, close=True)
                except Exception:
                    # Pool might not track it the same way, that's fine
                    pass

        conn = self._inner.getconn()
        
        # Validate it's alive
        try:
            if conn.closed:
                raise OperationalError("connection is closed")
            conn.isolation_level  # lightweight liveness check
        except (OperationalError, psycopg2.InterfaceError):
            # Dead connection — discard and try once more
            try:
                self._inner.putconn(conn, close=True)
            except Exception:
                pass
            log.warning("♻️  Discarded stale DB connection, getting fresh one...")
            conn = self._inner.getconn()

        with self._lock:
            self._checked_out[id(conn)] = conn
        return conn

    def putconn(self, conn, close=False):
        """Return a connection to the pool."""
        with self._lock:
            self._checked_out.pop(id(conn), None)
        
        if conn.closed:
            # Connection was already closed (e.g., via conn.close()).
            # We need to tell the inner pool to forget it — use close=True.
            try:
                self._inner.putconn(conn, close=True)
            except Exception:
                pass
            return
        
        try:
            self._inner.putconn(conn, close=close)
        except Exception as e:
            log.warning(f"⚠️  putconn error: {e}")
            try:
                conn.close()
            except Exception:
                pass

    def closeall(self):
        """Close all connections."""
        with self._lock:
            self._checked_out.clear()
        self._inner.closeall()

    @property
    def stats(self):
        """Return pool usage stats for diagnostics."""
        with self._lock:
            checked_out = len(self._checked_out)
        return {
            "checked_out": checked_out,
            "max": POOL_MAX_CONN,
        }


# ── Global pool ──────────────────────────────────────────────────────────────
_pool: SafeConnectionPool | None = None


def init_pool():
    """Initialize the global connection pool."""
    global _pool
    if _pool is None:
        try:
            _pool = SafeConnectionPool(
                minconn=POOL_MIN_CONN,
                maxconn=POOL_MAX_CONN,
                **DB_CONFIG
            )
            log.info(
                "✅ PostgreSQL Connection Pool initialized (min=%d, max=%d)",
                POOL_MIN_CONN, POOL_MAX_CONN
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
    Get a connection from the pool.
    
    IMPORTANT: Always pair with put_connection() in a finally block,
    or better yet use the get_db_cursor() context manager.
    """
    if _pool is None:
        init_pool()
    try:
        return _pool.getconn()
    except pool.PoolError:
        # Log pool stats for diagnostics
        if _pool:
            log.error("❌ Connection pool exhausted! Stats: %s", _pool.stats)
        raise


def put_connection(conn):
    """Return a connection to the pool. Safe to call even if conn is closed."""
    if _pool and conn:
        _pool.putconn(conn)


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
        try:
            conn.rollback()
        except Exception:
            pass
        log.error(f"❌ Database error: {e}")
        raise e
    finally:
        if cursor is not None:
            try:
                cursor.close()
            except Exception:
                pass
        put_connection(conn)


@contextmanager
def get_db_connection():
    """
    Context manager that provides a raw connection and guarantees return to pool.
    
    Usage:
        with get_db_connection() as conn:
            cur = conn.cursor()
            cur.execute(...)
            conn.commit()
            cur.close()
    """
    conn = get_connection()
    try:
        yield conn
    finally:
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
        log.error(f"❌ Query execution failed:\n{query}\n| Error: {e}")
        raise e


def execute_insert(query: str, params: tuple = None):
    """Execute an INSERT query and return the inserted row ID."""
    try:
        with get_db_cursor() as cursor:
            cursor.execute(query, params or ())
            res = cursor.fetchone()
            return res['id'] if res else None
    except Exception as e:
        log.error(f"❌ Insert execution failed:\n{query}\n| Error: {e}")
        raise e


def execute_update_delete(query: str, params: tuple = None):
    """Execute an UPDATE or DELETE query and return affected row count."""
    try:
        with get_db_cursor() as cursor:
            cursor.execute(query, params or ())
            return cursor.rowcount
    except Exception as e:
        log.error(f"❌ Update/Delete execution failed:\n{query}\n| Error: {e}")
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
