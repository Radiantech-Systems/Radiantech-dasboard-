"""
FastAPI application entrypoint.

- Creates DB tables on startup (idempotent; init.sql also does this for
  first-boot via docker-compose, this covers bare `uvicorn` runs too).
- Registers all REST routers.
- Exposes the /ws/telemetry WebSocket endpoint the dashboard connects to.
- Runs a background task that marks devices "offline" if no telemetry
  has arrived within DEVICE_OFFLINE_TIMEOUT_SECONDS.
"""
import asyncio
import os
from datetime import datetime, timezone
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Cookie, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import Base, engine, SessionLocal
from app.models import Device, PowerEvent
from app.websocket_manager import manager, traffic_signal_store
from app.auth import router as auth_router, _valid_session, _session_identity
from app.logger import get_logger

from app.routers import (
    telemetry,
    dashboard,
    system_info,
    performance,
    power,
    network,
    temperature,
    footage,
    ai_snapshots,
    fine_rates,
    snapshot_commands,
    video_commands,
    video_stream
)

logger = get_logger("main")


async def _offline_watcher():
    """Background loop: flips device.status to 'offline' if last_seen is stale."""
    while True:
        try:
            db = SessionLocal()
            cutoff = datetime.now(timezone.utc).timestamp() - settings.DEVICE_OFFLINE_TIMEOUT_SECONDS
            devices = db.query(Device).filter(Device.status == "online").all()
            for d in devices:
                if d.last_seen and d.last_seen.timestamp() < cutoff:
                    d.status = "offline"
                    db.add(PowerEvent(
                        device_id=d.device_id,
                        event_type="power_off",
                        reason=f"No telemetry received for over {settings.DEVICE_OFFLINE_TIMEOUT_SECONDS}s "
                               f"(device likely lost power, network, or crashed — no graceful shutdown signal received)",
                    ))
                    logger.warning(f"Device {d.device_id} marked OFFLINE (no telemetry received)")
            db.commit()
            db.close()
        except Exception as e:
            logger.error(f"offline_watcher error: {e}")
        await asyncio.sleep(1)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables ensured.")
    os.makedirs(settings.FOOTAGE_STORAGE_DIR, exist_ok=True)
    logger.info(f"Footage storage directory ensured at {settings.FOOTAGE_STORAGE_DIR}")
    
    os.makedirs(settings.AI_SNAPSHOT_STORAGE_DIR, exist_ok=True)
    logger.info(
       f"AI snapshot storage directory ensured at "
       f"{settings.AI_SNAPSHOT_STORAGE_DIR}" )
    

    task = asyncio.create_task(_offline_watcher())
    yield
    task.cancel()


app = FastAPI(title="Jetson Telemetry Dashboard API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(telemetry.router)
app.include_router(dashboard.router)
app.include_router(system_info.router)
app.include_router(performance.router)
app.include_router(power.router)
app.include_router(network.router)
app.include_router(temperature.router)
app.include_router(footage.router)
app.include_router(ai_snapshots.router)
app.include_router(fine_rates.router)
app.include_router(snapshot_commands.router)
app.include_router(video_commands.router)
app.include_router(video_stream.router)

# Stored media must use the dashboard session and page permissions.
# Resolve every requested path under its configured storage root to prevent
# path traversal. Jetson API-key upload routes remain separate and unchanged.
os.makedirs(settings.FOOTAGE_STORAGE_DIR, exist_ok=True)
os.makedirs(settings.AI_SNAPSHOT_STORAGE_DIR, exist_ok=True)


def _authorized_media_path(session_id: str | None, permission: str,
                           storage_dir: str, relative_path: str) -> Path:
    identity = _session_identity(session_id)
    if not identity:
        raise HTTPException(status_code=401, detail="Not authenticated")

    if identity.get("role") != "Admin" and permission not in identity.get("permissions", []):
        raise HTTPException(status_code=403, detail="Page access denied")

    root = Path(storage_dir).resolve()
    target = (root / relative_path).resolve()

    if not target.is_relative_to(root):
        raise HTTPException(status_code=400, detail="Invalid file path")

    if not target.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    return target


@app.get("/footage-files/{device_id}/{filename:path}")
def get_footage_file(
    device_id: str,
    filename: str,
    telemetry_session: str | None = Cookie(default=None),
):
    target = _authorized_media_path(
        telemetry_session,
        "sliced_footage",
        settings.FOOTAGE_STORAGE_DIR,
        str(Path(device_id) / filename),
    )
    return FileResponse(target)


@app.get("/ai-snapshot-files/{relative_path:path}")
def get_ai_snapshot_file(
    relative_path: str,
    telemetry_session: str | None = Cookie(default=None),
):
    target = _authorized_media_path(
        telemetry_session,
        "violations",
        settings.AI_SNAPSHOT_STORAGE_DIR,
        relative_path,
    )
    return FileResponse(target)

@app.get("/health")
def health():
    return {"status": "ok"}


@app.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    """
    Dashboard WebSocket authentication.

    The browser sends the telemetry_session cookie automatically
    after successful dashboard login.
    """
    telemetry_session = websocket.cookies.get("telemetry_session")

    if not _valid_session(telemetry_session):
        await websocket.close(code=4401)
        return

    await manager.connect(websocket)

    # Send the authoritative shared state to this client.
    current_signal_state = traffic_signal_store.get()
    if current_signal_state is None:
        current_signal_state = {
            "lane_1": "RED",
            "lane_2": "RED",
            "lane_3": "RED",
            "lane_4": "RED",
        }
        traffic_signal_store.set(current_signal_state)

    await websocket.send_json({
        "type": "traffic_signal_state",
        "lane_states": current_signal_state,
    })

    try:
        while True:
            raw_message = await websocket.receive_text()

            try:
                import json
                message = json.loads(raw_message)
            except (json.JSONDecodeError, TypeError):
                await websocket.send_json({
                    "type": "traffic_signal_error",
                    "error": "Invalid JSON message",
                })
                continue

            if not isinstance(message, dict):
                continue

            if message.get("type") != "traffic_signal_state":
                # Preserve compatibility with existing dashboard messages.
                continue

            # Only Admins and users explicitly granted traffic-signal
            # control may modify the shared signal state.
            identity = _session_identity(telemetry_session)
            if (
                not identity
                or (
                    identity.get("role") != "Admin"
                    and "traffic_signal_control" not in identity.get("permissions", [])
                )
            ):
                await websocket.send_json({
                    "type": "traffic_signal_error",
                    "error": "Traffic signal control permission required",
                })
                continue

            lane_states = message.get("lane_states")
            expected_lanes = {"lane_1", "lane_2", "lane_3", "lane_4"}

            if (
                not isinstance(lane_states, dict)
                or set(lane_states.keys()) != expected_lanes
                or any(state not in {"RED", "GREEN"} for state in lane_states.values())
                or sum(state == "GREEN" for state in lane_states.values()) > 1
            ):
                await websocket.send_json({
                    "type": "traffic_signal_error",
                    "error": "Invalid lane states; provide four lanes and at most one GREEN lane",
                })
                continue

            # Store the authoritative state for the ASRock HTTP response.
            traffic_signal_store.set(lane_states)

            # Broadcast the shared state to all connected clients.
            await manager.broadcast({
                "type": "traffic_signal_state",
                "lane_states": lane_states,
            })

            # Acknowledge the originating client.
            await websocket.send_json({
                "type": "traffic_signal_accepted",
                "lane_states": lane_states,
            })

    except WebSocketDisconnect:
        await manager.disconnect(websocket)

    except Exception:
        await manager.disconnect(websocket)
