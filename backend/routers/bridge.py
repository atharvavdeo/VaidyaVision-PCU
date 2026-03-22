from typing import Iterable
import httpx
from fastapi import APIRouter, Request, Response
from ..core.config import settings

router = APIRouter(tags=["bridge"])

_BRIDGED_PREFIXES: Iterable[str] = (
    "users",
    "scans",
    "reports",
    "appointments",
    "conversations",
    "medications",
    "exercises",
    "notifications",
    "analytics",
    "family",
    "developer",
    "doctor",
    "ai",
    "send-report-email",
    "call-reminder",
    "twiml-confirm",
    "twiml-reminder",
    "schedule-followup",
    "voice-notes",
    "ocr",
    "research",
    "upload",
    "ml-proxy",
)


def _should_bridge(path: str) -> bool:
    return any(path == p or path.startswith(f"{p}/") for p in _BRIDGED_PREFIXES)


@router.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def bridge_to_next_api(full_path: str, request: Request):
    if not _should_bridge(full_path):
        return Response(status_code=404, content="Not found")

    target = f"{settings.BRIDGE_NEXT_API_URL}/{full_path}"
    params = dict(request.query_params)
    body = await request.body()
    headers = {k: v for k, v in request.headers.items() if k.lower() not in {"host", "content-length"}}

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.request(
            method=request.method,
            url=target,
            params=params,
            content=body,
            headers=headers,
        )
    passthrough = {k: v for k, v in resp.headers.items() if k.lower() in {"content-type"}}
    return Response(content=resp.content, status_code=resp.status_code, headers=passthrough)
