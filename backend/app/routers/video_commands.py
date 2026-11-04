from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.security import verify_api_key, require_page_access
from app.video_commands import video_commands


router = APIRouter(
    prefix="/video-commands",
    tags=["video-commands"],
)


class VideoRequest(BaseModel):
    device_id: str
    since: str | None = None


class VideoResult(BaseModel):
    device_id: str
    request_id: str
    data: dict


@router.post("/request")
def request_videos(
    request: VideoRequest,
    _auth=Depends(require_page_access("sliced_footage")),
):
    request_id = video_commands.create_request(
        request.device_id,
        request.since,
    )

    return {
        "status": "pending",
        "request_id": request_id,
        "device_id": request.device_id,
    }


@router.get("/pending")
def get_pending_video_command(
    device_id: str,
    _auth=Depends(verify_api_key),
):
    command = video_commands.get_pending_command(device_id)

    if not command:
        return {
            "status": "none",
        }

    return command


@router.post("/result")
def submit_video_result(
    result: VideoResult,
    _auth=Depends(verify_api_key),
):
    command = video_commands.get_pending_command(
        result.device_id
    )

    if not command:
        raise HTTPException(
            status_code=404,
            detail="No pending video request",
        )

    if command["request_id"] != result.request_id:
        raise HTTPException(
            status_code=409,
            detail="Request ID does not match pending request",
        )

    video_commands.acknowledge_command(
        result.device_id,
        result.request_id,
    )

    video_commands.store_result(
        result.device_id,
        result.request_id,
        result.data,
    )

    return {
        "status": "ok",
        "request_id": result.request_id,
    }


@router.get("/result/{request_id}")
def get_video_result(
    request_id: str,
    _auth=Depends(require_page_access("sliced_footage")),
):
    result = video_commands.get_result(request_id)

    if not result:
        return {
            "status": "pending",
            "request_id": request_id,
        }

    return {
        "status": "ready",
        "request_id": request_id,
        "device_id": result["device_id"],
        "data": result["data"],
    }
