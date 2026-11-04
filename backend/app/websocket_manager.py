"""
- ConnectionManager: tracks connected dashboard WebSocket clients and
  broadcasts telemetry to all of them the instant it arrives.
- LatestTelemetryStore: an in-memory (RAM only) dict holding the most
  recent full telemetry payload per device. This backs all the "live
  only" REST endpoints (performance, power, network, system-info)
  without touching the database, since that data is explicitly NOT
  persisted per spec.
"""
from __future__ import annotations
import asyncio
from typing import Dict, Any
from fastapi import WebSocket

from app.logger import get_logger

logger = get_logger("websocket_manager")


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: list[WebSocket] = []
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections.append(websocket)
        logger.info(f"Dashboard client connected. Total clients: {len(self._connections)}")

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            if websocket in self._connections:
                self._connections.remove(websocket)
        logger.info(f"Dashboard client disconnected. Total clients: {len(self._connections)}")

    async def broadcast(self, message: Dict[str, Any]) -> None:
        dead: list[WebSocket] = []
        async with self._lock:
            connections = list(self._connections)
        for ws in connections:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        if dead:
            async with self._lock:
                for ws in dead:
                    if ws in self._connections:
                        self._connections.remove(ws)


class LatestTelemetryStore:
    """Thread-safe-ish (asyncio single-loop) store of latest payload per device_id."""

    def __init__(self) -> None:
        self._data: Dict[str, Dict[str, Any]] = {}

    def set(self, device_id: str, payload: Dict[str, Any]) -> None:
        self._data[device_id] = payload

    def get(self, device_id: str) -> Dict[str, Any] | None:
        return self._data.get(device_id)

    def get_all(self) -> Dict[str, Dict[str, Any]]:
        return self._data

    def first(self) -> Dict[str, Any] | None:
        """Convenience: returns the first (commonly only) device's telemetry."""
        if not self._data:
            return None
        return next(iter(self._data.values()))


manager = ConnectionManager()
latest_store = LatestTelemetryStore()

class TrafficSignalStateStore:
    """Stores only the latest traffic signal state in memory."""

    def __init__(self) -> None:
        self._state: Dict[str, Any] | None = None

    def set(self, state: Dict[str, Any]) -> None:
        self._state = state

    def get(self) -> Dict[str, Any] | None:
        return self._state


traffic_signal_store = TrafficSignalStateStore()
