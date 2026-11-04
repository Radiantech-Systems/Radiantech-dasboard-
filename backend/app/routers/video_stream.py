from __future__ import annotations

import asyncio
from typing import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse

from app.security import verify_api_key, require_page_access
from app.video_stream import video_streams


router = APIRouter(
    prefix="/video-stream",
    tags=["video-stream"],
)


# ============================================================
# Browser -> AWS -> Jetson
# ============================================================

@router.get("/{device_id}/{path:path}")
async def stream_video(
    device_id: str,
    path: str,
    request: Request,
    _auth=Depends(require_page_access("sliced_footage")),
):
    """
    Browser requests one specific MP4.

    AWS creates a temporary stream request for the Jetson,
    waits for the Jetson to connect, then forwards the
    video bytes to the browser.
    """

    path = path.strip().lstrip("/")

    # Basic path-traversal protection.
    if not path or ".." in path.split("/"):
        raise HTTPException(
            status_code=400,
            detail="Invalid video path",
        )

    # Preserve browser Range requests.
    range_header = request.headers.get("range")

    session = video_streams.create_request(
        device_id=device_id,
        path=path,
        range_header=range_header,
    )

    try:
        # Wait for Jetson to provide video headers.
        try:
            await asyncio.wait_for(
                session.headers_ready.wait(),
                timeout=30,
            )
        except asyncio.TimeoutError:
            video_streams.remove_session(session.request_id)

            raise HTTPException(
                status_code=504,
                detail="Jetson did not start video stream",
            )

        response_headers = dict(session.headers)
        response_headers.setdefault(
            "Accept-Ranges",
            "bytes",
        )

        response_headers.setdefault(
            "Cache-Control",
            "no-store",
        )

        async def generate() -> AsyncGenerator[bytes, None]:
            try:
                while True:
                    chunk = await session.queue.get()

                    if chunk is None:
                        break

                    yield chunk

            finally:
                session.finished.set()

        return StreamingResponse(
            generate(),
            status_code=session.status_code,
            media_type=response_headers.pop(
                "Content-Type",
                "video/mp4",
            ),
            headers=response_headers,
        )

    except Exception:
        session.finished.set()
        raise


# ============================================================
# Jetson -> AWS
# ============================================================

@router.get("/pending")
def get_pending_stream_command(
    device_id: str,
    _auth=Depends(verify_api_key),
):
    """
    Jetson polls this endpoint for an on-demand video request.
    """

    command = video_streams.get_pending_command(device_id)

    if not command:
        return {
            "status": "none",
        }

    return command


# ============================================================
# Jetson -> AWS : binary MP4 stream
# ============================================================

@router.post("/upload/{request_id}")
async def upload_video_stream(
    request_id: str,
    request: Request,
    _auth=Depends(verify_api_key),
):
    """
    Jetson sends the selected MP4 here.

    The video is forwarded chunk-by-chunk to the waiting
    browser. The complete MP4 is NOT stored in AWS.
    """

    session = video_streams.get_session(request_id)

    if not session:
        raise HTTPException(
            status_code=404,
            detail="Video stream request not found or expired",
        )


        # Acknowledge the pending command immediately.
    # This prevents Jetson from uploading the same request repeatedly.
    video_streams.acknowledge_command(
        session.device_id,
        request_id,
    )
    # --------------------------------------------------------
    # Receive video metadata from Jetson
    # --------------------------------------------------------

    status_code = request.headers.get(
        "x-video-status",
        "200",
    )

    content_type = request.headers.get(
        "x-video-content-type",
        "video/mp4",
    )

    content_length = request.headers.get(
        "x-video-content-length",
    )

    content_range = request.headers.get(
        "x-video-content-range",
    )

    accept_ranges = request.headers.get(
        "x-video-accept-ranges",
        "bytes",
    )

    try:
        session.status_code = int(status_code)
    except ValueError:
        session.status_code = 200

    session.headers = {
        "Content-Type": content_type,
        "Accept-Ranges": accept_ranges,
    }
    

    if content_length:
        session.headers["Content-Length"] = content_length

    if content_range:
        session.headers["Content-Range"] = content_range

    # Tell the browser-side request that the headers are ready.
    session.headers_ready.set()

    # --------------------------------------------------------
    # Stream MP4 bytes
    # --------------------------------------------------------

    try:
        async for chunk in request.stream():

            if not chunk:
                continue

            await session.queue.put(chunk)

    finally:
        # None = end of video.
        await session.queue.put(None)

        session.finished.set()

        video_streams.remove_session(request_id)

    return {
        "status": "ok",
        "request_id": request_id,
    }
