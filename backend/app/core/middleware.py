import time
import logging
from collections import defaultdict
from typing import Dict, List, Tuple
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.config import settings

logger = logging.getLogger(__name__)

_requests: Dict[str, List[float]] = defaultdict(list)


class RateLimitMemory:
    def __init__(self):
        self._requests: Dict[str, List[float]] = defaultdict(list)

    def check(self, key: str, max_requests: int, window: int) -> Tuple[bool, int]:
        now = time.time()
        window_start = now - window
        self._requests[key] = [t for t in self._requests[key] if t > window_start]
        if len(self._requests[key]) >= max_requests:
            remaining = 0
            reset_in = int(self._requests[key][0] + window - now)
            return False, max(0, reset_in)
        self._requests[key].append(now)
        remaining = max_requests - len(self._requests[key])
        return True, remaining


class RateLimitDB:
    def __init__(self):
        self._enabled = settings.SUNAT_ENV != "BETA"

    def check(self, key: str, max_requests: int, window: int) -> Tuple[bool, int]:
        if not self._enabled:
            return True, max_requests
        try:
            from app.core.database import get_db
            conn = next(get_db())
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT COUNT(*), MIN(created_at) FROM public.rate_limits "
                    "WHERE key = %s AND created_at > NOW() - INTERVAL '1 second' * %s",
                    (key, window)
                )
                row = cur.fetchone()
                count = row[0] if row else 0
                if count >= max_requests:
                    oldest = row[1] if row and row[1] else time.time()
                    reset_in = int(oldest.timestamp() + window - time.time()) if hasattr(oldest, 'timestamp') else 0
                    return False, max(0, reset_in)
                cur.execute(
                    "INSERT INTO public.rate_limits (key) VALUES (%s)",
                    (key,)
                )
            conn.commit()
        except Exception as e:
            logger.warning(f"RateLimitDB fallback a permitir: {e}")
        return True, max_requests


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        if settings.RATE_LIMIT_BACKEND == "db":
            self._backend = RateLimitDB()
        else:
            self._backend = RateLimitMemory()

    async def dispatch(self, request: Request, call_next):
        if not settings.RATE_LIMIT_ENABLED:
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        key = f"{client_ip}:{request.url.path}"

        allowed, reset_in = self._backend.check(
            key,
            settings.RATE_LIMIT_REQUESTS,
            settings.RATE_LIMIT_WINDOW_SECONDS,
        )

        if not allowed:
            logger.warning(f"Rate limit excedido para {key}")
            return Response(
                status_code=429,
                content='{"detail": "Demasiadas solicitudes. Intente de nuevo en unos segundos."}',
                media_type="application/json",
                headers={"Retry-After": str(reset_in)},
            )

        response = await call_next(request)
        return response
