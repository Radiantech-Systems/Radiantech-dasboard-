import base64
import binascii
import hashlib
import json
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Cookie, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import Column, DateTime, JSON, String
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import _session_identity
from app.database import Base, get_db

router = APIRouter(prefix="/event-workflow", tags=["event-workflow"])


class EventWorkflow(Base):
    __tablename__ = "event_workflow"

    id = Column(String(64), primary_key=True)
    device_id = Column(String(128), nullable=False, index=True)
    data = Column(JSON, nullable=False)
    status = Column(String(32), nullable=False, index=True)
    requested_by = Column(String(128), nullable=False)
    reviewed_by = Column(String(128), nullable=True)
    updated_at = Column(
        DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )


class ActionRequest(BaseModel):
    device_id: str = Field(min_length=1, max_length=128)
    category: str = Field(min_length=1, max_length=128)
    filename: str = Field(min_length=1, max_length=512)
    timestamp: str = Field(min_length=1, max_length=128)
    camera: str = Field(default="", max_length=256)
    location: str = Field(default="", max_length=512)
    violation: str = Field(default="", max_length=128)
    action: Literal["process", "exemption"]
    image: str = Field(default="", max_length=16000000)
    mime_type: str = Field(default="", max_length=64)


class ReviewRequest(BaseModel):
    decision: Literal["approve", "reject"]


def current_user(telemetry_session: str | None = Cookie(default=None)):
    identity = _session_identity(telemetry_session)
    if not identity:
        raise HTTPException(401, "Sign in again.")
    return identity


def can_use_events(identity):
    if (
        identity.get("role") != "IT"
        and "violations" not in identity.get("permissions", [])
    ):
        raise HTTPException(403, "Events access required.")


def commissioner(identity):
    if identity.get("police_role") != "COMMISSIONER":
        raise HTTPException(403, "Commissioner access required.")


def public(row):
    return {
        **{
            key: value for key, value in row.data.items()
            if key not in {"image", "mime_type"}
        },
        "id": row.id,
        "status": row.status,
        "requested_by": row.requested_by,
        "reviewed_by": row.reviewed_by,
        "updated_at": row.updated_at.isoformat(),
    }


@router.get("/states")
def states(
    device_id: str,
    identity=Depends(current_user),
    db: Session = Depends(get_db),
):
    can_use_events(identity)
    rows = db.query(EventWorkflow).filter(
        EventWorkflow.device_id == device_id
    ).all()
    return [public(row) for row in rows]


@router.post("/actions")
def action(
    payload: ActionRequest,
    identity=Depends(current_user),
    db: Session = Depends(get_db),
):
    can_use_events(identity)
    event_id = hashlib.sha256(json.dumps([
        payload.device_id,
        payload.category,
        payload.filename,
        payload.timestamp,
    ]).encode()).hexdigest()

    row = db.query(EventWorkflow).filter(
        EventWorkflow.id == event_id
    ).with_for_update().first()

    # Existing terminal or pending actions cannot be overwritten.
    if row:
        raise HTTPException(
            409, "This event already has an action. Refreshing its status."
        )

    snapshot_mime = None
    snapshot_hash = None

    if payload.action == "exemption":
        if not payload.image:
            raise HTTPException(
                400, "This request requires the event snapshot."
            )
        try:
            raw = base64.b64decode(payload.image, validate=True)
        except (binascii.Error, ValueError):
            raise HTTPException(400, "Invalid snapshot image.")

        if raw.startswith(b"\xff\xd8\xff"):
            snapshot_mime = "image/jpeg"
        elif raw.startswith(b"\x89PNG\r\n\x1a\n"):
            snapshot_mime = "image/png"
        elif raw.startswith((b"GIF87a", b"GIF89a")):
            snapshot_mime = "image/gif"
        elif (
            raw.startswith(b"RIFF")
            and len(raw) >= 12
            and raw[8:12] == b"WEBP"
        ):
            snapshot_mime = "image/webp"
        else:
            raise HTTPException(
                400, "Snapshot must be JPEG, PNG, GIF or WebP."
            )

        snapshot_hash = hashlib.sha256(raw).hexdigest()

    data = payload.model_dump()
    data["image"] = (
        payload.image if payload.action == "exemption" else ""
    )
    data["mime_type"] = snapshot_mime
    data["snapshot_sha256"] = snapshot_hash
    data.pop("action")
    row = EventWorkflow(
        id=event_id,
        device_id=payload.device_id,
        data=data,
        status=(
            "processed" if payload.action == "process"
            else "exemption_pending"
        ),
        requested_by=identity["username"],
        updated_at=datetime.now(timezone.utc),
    )
    db.add(row)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Another user already acted on this event.")
    db.refresh(row)
    return public(row)


@router.get("/notifications")
def notifications(
    identity=Depends(current_user),
    db: Session = Depends(get_db),
):
    commissioner(identity)
    rows = db.query(EventWorkflow).filter(
        EventWorkflow.status == "exemption_pending"
    ).order_by(EventWorkflow.updated_at.desc()).all()
    return [public(row) for row in rows]


@router.post("/notifications/{event_id}/review")
def review(
    event_id: str,
    payload: ReviewRequest,
    identity=Depends(current_user),
    db: Session = Depends(get_db),
):
    commissioner(identity)
    row = db.query(EventWorkflow).filter(
        EventWorkflow.id == event_id
    ).with_for_update().first()

    if not row:
        raise HTTPException(404, "Request not found.")
    if row.status != "exemption_pending":
        raise HTTPException(409, "This request has already been reviewed.")

    row.status = (
        "exemption_approved"
        if payload.decision == "approve"
        else "processed"
    )
    row.reviewed_by = identity["username"]
    row.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(row)
    return public(row)


@router.get("/notifications/{event_id}/snapshot")
def notification_snapshot(
    event_id: str,
    identity=Depends(current_user),
    db: Session = Depends(get_db),
):
    commissioner(identity)
    row = db.query(EventWorkflow).filter(
        EventWorkflow.id == event_id
    ).first()

    if not row:
        raise HTTPException(404, "Request not found.")

    image = row.data.get("image")
    mime_type = row.data.get("mime_type")
    if not image or not mime_type:
        raise HTTPException(
            404,
            "This older request has no saved snapshot. "
            "Snapshot evidence is saved for new requests.",
        )

    return {
        "image": image,
        "mime_type": mime_type,
        "snapshot_sha256": row.data.get("snapshot_sha256"),
    }
