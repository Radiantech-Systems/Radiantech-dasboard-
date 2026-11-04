"""
GET /power — live-only power metrics.

Also hosts "Subsystem Power Details": a power on/off event log with
timestamp and (for power-off) a reason. Two ways events get created:
  1. Automatic — the offline-watcher in main.py logs a power_off event
     when a device stops sending telemetry (reason: "no telemetry
     received"), and telemetry.py logs a power_on event whenever a
     device transitions from offline/unseen to online.
  2. Explicit — the Jetson can POST /power/events itself, e.g. from a
     systemd ExecStop hook right before a graceful shutdown/reboot, with
     a real reason ("system shutdown requested", "reboot requested").
"""
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Query, Depends
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.routers.system_info import _resolve
from app.security import require_page_access
from app.database import get_db
from app.models import PowerEvent
from app.schemas import PowerEventIn, PowerEventOut
from app.logger import get_logger

router = APIRouter(tags=["power"])
logger = get_logger("power")


@router.get("/power")
def get_power(device_id: Optional[str] = Query(None), _auth=Depends(require_page_access("dashboard"))):
    live = _resolve(device_id)
    return live.get("power", {})


@router.post("/power/events", response_model=PowerEventOut)
def log_power_event(event: PowerEventIn, db: Session = Depends(get_db), _auth=Depends(require_page_access("dashboard"))):
    row = PowerEvent(device_id=event.device_id, event_type=event.event_type, reason=event.reason)
    db.add(row)
    db.commit()
    db.refresh(row)
    logger.info(f"Power event logged: {event.device_id} {event.event_type} ({event.reason or 'no reason given'})")
    return row


@router.get("/power/events", response_model=list[PowerEventOut])
def get_power_events(
    device_id: Optional[str] = Query(None),
    range: Optional[str] = Query(None, description="last_hour | last_day | last_week"),
    start: Optional[datetime] = Query(None),
    end: Optional[datetime] = Query(None),
    limit: int = Query(200, le=1000),
    db: Session = Depends(get_db),
    _auth=Depends(require_page_access("dashboard")),
):
    presets = {"last_hour": timedelta(hours=1), "last_day": timedelta(days=1), "last_week": timedelta(weeks=1)}
    if range and range in presets:
        end_dt = datetime.now(timezone.utc)
        start_dt = end_dt - presets[range]
    elif start and end:
        start_dt, end_dt = start, end
    else:
        end_dt = datetime.now(timezone.utc)
        start_dt = end_dt - timedelta(days=1)  # default: last day of events

    q = db.query(PowerEvent).filter(
        and_(PowerEvent.timestamp >= start_dt, PowerEvent.timestamp <= end_dt)
    )
    if device_id:
        q = q.filter(PowerEvent.device_id == device_id)

    return q.order_by(PowerEvent.timestamp.desc()).limit(limit).all()

