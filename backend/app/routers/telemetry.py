"""
POST /telemetry
Receives one telemetry document per second from a Jetson agent.

Responsibilities:
1. Upsert the device row (registry + status = online + last_seen).
2. Persist a TemperatureHistory row (the ONLY historical data kept).
3. Update the in-memory latest-telemetry store (powers live REST + WS).
4. Broadcast the payload to all connected dashboard WebSocket clients.
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.security import verify_api_key
from app.schemas import TelemetryPayload
from app.models import Device, TemperatureHistory, PowerEvent
from app.websocket_manager import manager, latest_store, traffic_signal_store
from app.logger import get_logger

router = APIRouter(tags=["telemetry"])
logger = get_logger("telemetry")


@router.post("/telemetry")
async def ingest_telemetry(payload: TelemetryPayload, db: Session = Depends(get_db), _auth=Depends(verify_api_key)):
    now = datetime.now(timezone.utc)
    device_id = payload.system_info.device_id

    # 1. Upsert device
    device = db.query(Device).filter(Device.device_id == device_id).first()
    was_online = device is not None and device.status == "online"
    if device is None:
        device = Device(
            device_id=device_id,
            device_name=payload.system_info.device_name,
            hostname=payload.system_info.hostname,
            ip_address=payload.network.ip_address,
            status="online",
            last_seen=now,
        )
        db.add(device)
    else:
        device.device_name = payload.system_info.device_name
        device.hostname = payload.system_info.hostname
        device.ip_address = payload.network.ip_address
        device.status = "online"
        device.last_seen = now

    # 1b. Subsystem Power Details — log a power_on event whenever a
    # device transitions from offline/unseen to online (covers both a
    # fresh boot and reconnecting after a network/power gap).
    if not was_online:
        db.add(PowerEvent(device_id=device_id, event_type="power_on", reason="Telemetry resumed"))

    # 2. Persist temperature/cooling history (only historical data required)
    temp_row = TemperatureHistory(
        device_id=device_id,
        cpu_temperature=payload.cpu.temperature_c,
        gpu_temperature=payload.gpu.temperature_c,
        board_temperature=payload.cooling.board_temperature_c,
        fan_rpm=payload.cooling.fan_rpm,
        fan_pwm=payload.cooling.fan_pwm,
        timestamp=payload.timestamp or now,
    )
    db.add(temp_row)
    db.commit()

    # 3. Update in-memory live store
    data = payload.model_dump(mode="json")
    data["server_received_at"] = now.isoformat()
    latest_store.set(device_id, data)

    # 4. Push to all connected dashboards in real time
    await manager.broadcast({"type": "telemetry", "device_id": device_id, "data": data})

    return {
        "status": "ok",
        "traffic_signal_state": traffic_signal_store.get(),
    }
