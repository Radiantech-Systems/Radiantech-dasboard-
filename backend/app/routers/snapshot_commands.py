from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.security import verify_api_key, require_page_access
from app.snapshot_commands import snapshot_commands


router = APIRouter(prefix="/snapshot-commands", tags=["snapshot-commands"])


class SnapshotRequest(BaseModel):
    device_id: str
    offset: int = Field(default=0, ge=0)
    limit: int = Field(default=30, ge=1, le=100)


class SnapshotResult(BaseModel):
    device_id: str
    request_id: str
    data: dict


@router.post("/request")
def request_snapshots(
    request: SnapshotRequest,
    _auth=Depends(require_page_access("violations")),
):
    request_id = snapshot_commands.create_request(
        request.device_id,
        offset=request.offset,
        limit=request.limit,
    )

    return {
        "status": "pending",
        "request_id": request_id,
        "device_id": request.device_id,
    }


@router.get("/pending")
def get_pending_command(
    device_id: str,
    _auth=Depends(verify_api_key),
):
    command = snapshot_commands.get_pending_command(device_id)

    if not command:
        return {
            "status": "none",
        }

    return command


@router.post("/result")
def submit_snapshot_result(
    result: SnapshotResult,
    _auth=Depends(verify_api_key),
):
    command = snapshot_commands.get_pending_command(result.device_id)

    if not command:
        raise HTTPException(
            status_code=404,
            detail="No pending snapshot request",
        )

    if command["request_id"] != result.request_id:
        raise HTTPException(
            status_code=409,
            detail="Request ID does not match pending request",
        )

    snapshot_commands.acknowledge_command(
        result.device_id,
        result.request_id,
    )

    snapshot_commands.store_result(
        result.device_id,
        result.request_id,
        result.data,
    )

    return {
        "status": "ok",
        "request_id": result.request_id,
    }


@router.get("/result/{request_id}")
def get_snapshot_result(
    request_id: str,
    _auth=Depends(require_page_access("violations")),
):
    result = snapshot_commands.get_result(request_id)

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

