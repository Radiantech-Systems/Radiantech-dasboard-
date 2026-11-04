"""
GET /temperature/history
Historical temperature/cooling data with time-range filters and
optional CSV export, backing the Temperature History page.
"""
import csv
import io
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.database import get_db
from app.models import TemperatureHistory
from app.schemas import TemperatureHistoryOut
from app.websocket_manager import latest_store
from app.security import require_page_access

router = APIRouter(tags=["temperature"])

RANGE_PRESETS = {
    "last_hour": timedelta(hours=1),
    "last_day": timedelta(days=1),
    "last_week": timedelta(weeks=1),
}


def _time_bounds(range_preset: Optional[str], start: Optional[datetime], end: Optional[datetime]):
    if range_preset and range_preset in RANGE_PRESETS:
        end_dt = datetime.now(timezone.utc)
        start_dt = end_dt - RANGE_PRESETS[range_preset]
        return start_dt, end_dt
    if start and end:
        return start, end
    # default: last hour
    end_dt = datetime.now(timezone.utc)
    return end_dt - timedelta(hours=1), end_dt


def _query_rows(db: Session, device_id: Optional[str], range_preset, start, end):
    start_dt, end_dt = _time_bounds(range_preset, start, end)
    q = db.query(TemperatureHistory).filter(
        and_(TemperatureHistory.timestamp >= start_dt, TemperatureHistory.timestamp <= end_dt)
    )
    if device_id:
        q = q.filter(TemperatureHistory.device_id == device_id)
    return q.order_by(TemperatureHistory.timestamp.asc()).all()


@router.get("/temperature/history", response_model=list[TemperatureHistoryOut])
def get_temperature_history(
    device_id: Optional[str] = Query(None),
    range: Optional[str] = Query(None, description="last_hour | last_day | last_week"),
    start: Optional[datetime] = Query(None),
    end: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    _auth=Depends(require_page_access("temperature_history")),
):
    return _query_rows(db, device_id, range, start, end)


@router.get("/temperature/history/live")
def get_temperature_live(device_id: Optional[str] = Query(None), _auth=Depends(require_page_access("temperature_history"))):
    """Current live temperature/cooling snapshot (not persisted separately, mirrors latest telemetry)."""
    live = latest_store.get(device_id) if device_id else latest_store.first()
    if not live:
        return {}
    return {
        "cpu_temperature_c": (live.get("cpu") or {}).get("temperature_c"),
        "gpu_temperature_c": (live.get("gpu") or {}).get("temperature_c"),
        "board_temperature_c": (live.get("cooling") or {}).get("board_temperature_c"),
        "fan_rpm": (live.get("cooling") or {}).get("fan_rpm"),
        "fan_pwm": (live.get("cooling") or {}).get("fan_pwm"),
    }


@router.get("/temperature/history/export")
def export_temperature_csv(
    device_id: Optional[str] = Query(None),
    range: Optional[str] = Query(None),
    start: Optional[datetime] = Query(None),
    end: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    _auth=Depends(require_page_access("temperature_history")),
):
    rows = _query_rows(db, device_id, range, start, end)
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["device_id", "timestamp", "cpu_temperature_c", "gpu_temperature_c",
                      "board_temperature_c", "fan_rpm", "fan_pwm"])
    for r in rows:
        writer.writerow([r.device_id, r.timestamp.isoformat(), r.cpu_temperature,
                          r.gpu_temperature, r.board_temperature, r.fan_rpm, r.fan_pwm])
    buffer.seek(0)
    filename = f"temperature_history_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
