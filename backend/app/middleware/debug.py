import json
import time
import uuid
import logging
from typing import Any, Dict

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


logger = logging.getLogger("http.debug")
# Ensure our debug logger actually emits to console even under Uvicorn's
# default logging config (which doesn't attach handlers to arbitrary loggers).
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(handler)
    # Avoid double-logging via root when a handler is attached
    logger.propagate = False
if not logger.level:
    logger.setLevel(logging.INFO)


def _preview_bytes(b: bytes, limit: int = 2048) -> str:
    try:
        s = b.decode("utf-8", errors="replace")
    except Exception:
        s = str(b)
    if len(s) > limit:
        return s[:limit] + "…"  # ellipsis
    return s


class DebugLoggingMiddleware(BaseHTTPMiddleware):
    """Logs request and response summaries for debugging.

    Enabled when:
      - app setting DEBUG_HTTP_LOGS is True, or
      - request has header 'X-Debug: 1', or
      - request has header 'X-Debug-Id'.
    """

    def __init__(
        self,
        app,
        debug: bool = False,
        style: str = "json",
        include_headers: bool = True,
        max_body_preview: int = 4096,
    ) -> None:
        super().__init__(app)
        self.debug = debug
        self.style = style.lower() if isinstance(style, str) else "json"
        self.include_headers = include_headers
        self.max_body_preview = max_body_preview

    async def dispatch(self, request: Request, call_next):
        started = time.perf_counter()
        req_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        dbg_id = request.headers.get("X-Debug-Id") or ""
        should_debug = (
            self.debug
            or request.headers.get("X-Debug") == "1"
            or bool(dbg_id)
        )

        # Read and cache request body to allow downstream handlers to read
        try:
            raw_body = await request.body()
            # Starlette caches Request._body for subsequent reads
            setattr(request, "_body", raw_body)
        except Exception:
            raw_body = b""

        if should_debug:
            try:
                if self.style == "pretty":
                    hdrs = {}
                    if self.include_headers:
                        allowed = {"content-type", "content-length", "authorization", "x-debug", "x-debug-id", "x-request-id"}
                        hdrs = {k.lower(): v for k, v in request.headers.items() if k.lower() in allowed}
                    q = ("?" + request.url.query) if request.url.query else ""
                    preview = _preview_bytes(raw_body, self.max_body_preview)
                    msg = (
                        f"REQ req_id={req_id} dbg_id={dbg_id or '-'} "
                        f"{request.method} {request.url.path}{q} "
                        f"client={getattr(request.client, 'host', None)} "
                        f"headers={hdrs} body={preview!r}"
                    ) if self.include_headers else (
                        f"REQ req_id={req_id} dbg_id={dbg_id or '-'} "
                        f"{request.method} {request.url.path}{q} "
                        f"client={getattr(request.client, 'host', None)} "
                        f"body={preview!r}"
                    )
                    logger.info(msg)
                else:
                    info: Dict[str, Any] = {
                        "kind": "request",
                        "req_id": req_id,
                        "dbg_id": dbg_id,
                        "method": request.method,
                        "path": request.url.path,
                        "query": request.url.query,
                        "client": getattr(request.client, "host", None),
                        "body_preview": _preview_bytes(raw_body, self.max_body_preview),
                    }
                    if self.include_headers:
                        info["headers"] = {k: v for k, v in request.headers.items() if k.lower() in {"content-type", "content-length", "authorization", "x-debug", "x-debug-id", "x-request-id"}}
                    logger.info(json.dumps(info, ensure_ascii=False))
            except Exception:
                # best-effort only
                pass

        response = await call_next(request)

        # Collect response body by iterating the body iterator, then re-create Response
        try:
            resp_bytes = b""
            async for chunk in response.body_iterator:  # type: ignore[attr-defined]
                resp_bytes += chunk
            duration_ms = int((time.perf_counter() - started) * 1000)

            if should_debug:
                try:
                    if self.style == "pretty":
                        preview = _preview_bytes(resp_bytes, self.max_body_preview)
                        hdrs = dict(response.headers) if self.include_headers else {}
                        msg = (
                            f"RES req_id={req_id} dbg_id={dbg_id or '-'} "
                            f"status={response.status_code} duration={duration_ms}ms "
                            f"headers={hdrs} body={preview!r}"
                        ) if self.include_headers else (
                            f"RES req_id={req_id} dbg_id={dbg_id or '-'} "
                            f"status={response.status_code} duration={duration_ms}ms "
                            f"body={preview!r}"
                        )
                        logger.info(msg)
                    else:
                        info = {
                            "kind": "response",
                            "req_id": req_id,
                            "dbg_id": dbg_id,
                            "status": response.status_code,
                            "duration_ms": duration_ms,
                            "body_preview": _preview_bytes(resp_bytes, self.max_body_preview),
                        }
                        if self.include_headers:
                            info["headers"] = dict(response.headers)
                        logger.info(json.dumps(info, ensure_ascii=False))
                except Exception:
                    pass

            new_response = Response(
                content=resp_bytes,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.media_type,
            )
        except Exception:
            # If anything goes wrong, fall back to original response
            new_response = response

        # Always include request id for correlation
        try:
            new_response.headers.setdefault("X-Request-ID", req_id)
        except Exception:
            pass

        return new_response
