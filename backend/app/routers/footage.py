"""
Recorded Footage — time-sliced video clips captured on the Jetson and
uploaded here for playback in the dashboard. Separate from the live
CCTV view (which streams continuously via MediaMTX): these are
discrete, already-recorded files the Jetson finishes and pushes over
once each segment completes.

Files are stored on disk under FOOTAGE_STORAGE_DIR/<device_id>/<filename>
and served back out as static files (mounted in main.py). Metadata
(who/when/how long/how big) lives in the footage_clips table so the
dashboard can list and filter without touching the filesystem directly.
"""
import os
import re
import shutil
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, Query, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.database import get_db
from app.models import FootageClip
from app.schemas import FootageClipOut
from app.security import require_page_access
from app.config import settings
from app.logger import get_logger

router = APIRouter(tags=["footage"])
logger = get_logger("footage")

_SAFE_NAME = re.compile(r"[^A-Za-z0-9._-]")


def _sanitize(name: str) -> str:
    """Strip anything that isn't a safe filename character, to prevent
    path traversal via a crafted device_id/filename."""
    return _SAFE_NAME.sub("_", name)[:200]


@router.post("/footage/upload")
async def upload_footage(
    device_id: str = Form(...),
    started_at: datetime = Form(...),
    duration_seconds: float = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _auth=Depends(require_page_access("sliced_footage")),
):
    safe_device = _sanitize(device_id)
    safe_filename = _sanitize(file.filename or f"clip_{int(started_at.timestamp())}.mp4")

    device_dir = os.path.join(settings.FOOTAGE_STORAGE_DIR, safe_device)
    os.makedirs(device_dir, exist_ok=True)
    dest_path = os.path.join(device_dir, safe_filename)

    try:
        with open(dest_path, "wb") as out_file:
            shutil.copyfileobj(file.file, out_file)
    except Exception as e:
        logger.error(f"Failed to save footage upload: {e}")
        raise HTTPException(status_code=500, detail="Failed to store uploaded file")

    size_bytes = os.path.getsize(dest_path)

    clip = FootageClip(
        device_id=safe_device,
        filename=safe_filename,
        started_at=started_at,
        duration_seconds=duration_seconds,
        size_bytes=size_bytes,
    )
    db.add(clip)
    db.commit()
    db.refresh(clip)

    logger.info(f"Stored footage clip {safe_filename} ({size_bytes} bytes) from {safe_device}")
    return {"status": "ok", "id": clip.id}


@router.get("/footage/list", response_model=list[FootageClipOut])
def list_footage(
    device_id: Optional[str] = Query(None),
    range: Optional[str] = Query(None, description="last_hour | last_day | last_week"),
    start: Optional[datetime] = Query(None),
    end: Optional[datetime] = Query(None),
    limit: int = Query(200, le=1000),
    db: Session = Depends(get_db),
    _auth=Depends(require_page_access("sliced_footage")),
):
    presets = {"last_hour": timedelta(hours=1), "last_day": timedelta(days=1), "last_week": timedelta(weeks=1)}
    if range and range in presets:
        end_dt = datetime.now(timezone.utc)
        start_dt = end_dt - presets[range]
    elif start and end:
        start_dt, end_dt = start, end
    else:
        end_dt = datetime.now(timezone.utc)
        start_dt = end_dt - timedelta(days=1)  # default: last day of clips

    q = db.query(FootageClip).filter(
        and_(FootageClip.started_at >= start_dt, FootageClip.started_at <= end_dt)
    )
    if device_id:
        q = q.filter(FootageClip.device_id == device_id)

    rows = q.order_by(FootageClip.started_at.desc()).limit(limit).all()

    return [
        FootageClipOut(
            id=r.id,
            device_id=r.device_id,
            filename=r.filename,
            started_at=r.started_at,
            duration_seconds=r.duration_seconds,
            size_bytes=r.size_bytes,
            url=f"/footage-files/{r.device_id}/{r.filename}",
        )
        for r in rows
    ]
