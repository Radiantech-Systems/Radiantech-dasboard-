import os
import re
import shutil
from datetime import datetime, timezone
from typing import Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
)
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import AISnapshot
from app.security import require_page_access


router = APIRouter(tags=["ai-snapshots"])

_SAFE_NAME = re.compile(r"[^A-Za-z0-9._-]")


def _sanitize(value: str) -> str:
    return _SAFE_NAME.sub("_", value)[:200]


@router.post("/ai-snapshots/upload")
async def upload_ai_snapshot(
    camera: str = Form(...),
    category: str = Form(...),
    label: str = Form(...),
    confidence: Optional[float] = Form(None),
    captured_at: Optional[datetime] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _auth=Depends(require_page_access("violations")),
):
    category = category.lower().strip()

    allowed_categories = {
        "vehicle",
        "vehicles",
        "human",
        "humans",
        "other",
        "others",
    }

    if category not in allowed_categories:
        raise HTTPException(
            status_code=400,
            detail="category must be vehicle, human, or other",
        )

    # Normalize category to singular form
    if category == "vehicles":
        category = "vehicle"
    elif category == "humans":
        category = "human"
    elif category == "others":
        category = "other"

    safe_camera = _sanitize(camera)
    safe_label = _sanitize(label)

    timestamp = captured_at or datetime.now(timezone.utc)

    date_dir = timestamp.strftime("%Y/%m/%d")

    snapshot_dir = os.path.join(
        settings.AI_SNAPSHOT_STORAGE_DIR,
        safe_camera,
        category,
        date_dir,
    )

    os.makedirs(snapshot_dir, exist_ok=True)

    original_name = file.filename or "snapshot.jpg"
    safe_original = _sanitize(original_name)

    filename = (
        f"{timestamp.strftime('%H-%M-%S-%f')[:-3]}"
        f"_{safe_label}_{safe_original}"
    )

    dest_path = os.path.join(snapshot_dir, filename)

    try:
        with open(dest_path, "wb") as out_file:
            shutil.copyfileobj(file.file, out_file)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save snapshot: {e}",
        )

    snapshot = AISnapshot(
        camera=safe_camera,
        category=category,
        label=safe_label,
        confidence=confidence,
        filename=os.path.join(
            safe_camera,
            category,
            date_dir,
            filename,
        ),
        captured_at=timestamp,
    )

    db.add(snapshot)
    db.commit()
    db.refresh(snapshot)

    return {
        "status": "ok",
        "id": snapshot.id,
    }


@router.get("/ai-snapshots")
def list_ai_snapshots(
    category: Optional[str] = Query(None),
    camera: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    _auth=Depends(require_page_access("violations")),
):
    query = db.query(AISnapshot)

    if category:
        category = category.lower()

        if category == "vehicles":
            category = "vehicle"
        elif category == "humans":
            category = "human"
        elif category == "others":
            category = "other"

        query = query.filter(AISnapshot.category == category)

    if camera:
        query = query.filter(AISnapshot.camera == camera)

    rows = (
        query
        .order_by(AISnapshot.captured_at.desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "id": row.id,
            "camera": row.camera,
            "category": row.category,
            "label": row.label,
            "confidence": row.confidence,
            "captured_at": row.captured_at,
            "image_url": f"/ai-snapshot-files/{row.filename}",
        }
        for row in rows
    ]
