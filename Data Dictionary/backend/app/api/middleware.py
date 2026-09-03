from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.logging import logger

try:
    from slowapi import Limiter
    from slowapi.util import get_remote_address

    limiter = Limiter(key_func=get_remote_address)
except Exception:

    def get_remote_address(request: Request):
        try:
            return request.client.host
        except Exception:
            return "unknown"

    class RateLimitExceeded(Exception):
        pass

    class _NoOpLimiter:
        def limit(self, *args, **kwargs):
            def _decorator(func):
                return func

            return _decorator

    limiter = _NoOpLimiter()


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )
        response.headers["Content-Security-Policy"] = "default-src 'self'"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response


class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            logger.info(f"{request.method} {request.url.path} {response.status_code}")
            return response
        except Exception as e:
            logger.exception("Request error", exc_info=True)
            raise
