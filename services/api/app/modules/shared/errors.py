from __future__ import annotations

from typing import Any

from fastapi import HTTPException, Request


def api_error(
    status_code: int,
    code: str,
    message: str,
    details: dict[str, Any] | None = None,
    request: Request | None = None,
) -> HTTPException:
    request_id = request.headers.get("X-Request-ID") if request else None
    return HTTPException(
        status_code=status_code,
        detail={
            "error": {
                "code": code,
                "message": message,
                "details": details or {},
                "request_id": request_id,
            }
        },
    )
