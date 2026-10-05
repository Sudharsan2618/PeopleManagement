import time
import threading
from functools import wraps
from cachetools import TTLCache

_caches = {}
_cache_lock = threading.Lock()

def get_cache(namespace: str, maxsize: int = 1000, ttl: int = 180) -> TTLCache:
    with _cache_lock:
        if namespace not in _caches:
            _caches[namespace] = TTLCache(maxsize=maxsize, ttl=ttl)
        return _caches[namespace]

def clear_namespace(namespace: str):
    with _cache_lock:
        if namespace in _caches:
            _caches[namespace].clear()

def invalidate_prospect_cache():
    """Invalidate all prospects-related caches."""
    clear_namespace("prospects_list")
    clear_namespace("prospects_stats")
    clear_namespace("prospects_distinct_courses")
    clear_namespace("prospects_distinct_statuses")
    clear_namespace("prospects_distinct_tags")
    clear_namespace("prospects_distinct_lead_sources")
    clear_namespace("prospects_distinct_lead_types")

def cached_route(namespace: str, ttl_seconds: int = 180, maxsize: int = 1000):
    """
    Simple route-level caching decorator for FastAPI sync routes.
    Keys are built deterministically from kwargs.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            cache = get_cache(namespace, maxsize, ttl_seconds)
            # Create a deterministic key from kwargs (ignoring self/args since FastAPI injects query params as kwargs)
            key = frozenset(kwargs.items())
            
            try:
                return cache[key]
            except KeyError:
                result = func(*args, **kwargs)
                cache[key] = result
                return result
        return wrapper
    return decorator
