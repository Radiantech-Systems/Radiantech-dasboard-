"""
ORM models. Only two tables are persisted, per spec:
  - devices              : device registry + online/offline status
  - temperature_history  : every temperature/cooling reading, timestamped

Everything else (CPU/GPU/RAM/Storage/Power/Network/Camera) is
live-only and lives in the in-memory latest-telemetry store
(see websocket_manager.py), never written to the DB.
"""
from sqlalchemy import Column, String, DateTime, BigInteger, Double, Integer, ForeignKey
from sqlalchemy.sql import func

from app.database import Base


class Device(Base):
    __tablename__ = "devices"

    device_id = Column(String(64), primary_key=True)
    device_name = Column(String(128), nullable=False)
    hostname = Column(String(128))
    ip_address = Column(String(64))
    status = Column(String(16), nullable=False, default="offline")
    last_seen = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class TemperatureHistory(Base):
    __tablename__ = "temperature_history"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    device_id = Column(String(64), ForeignKey("devices.device_id", ondelete="CASCADE"), nullable=False, index=True)
    cpu_temperature = Column(Double)
    gpu_temperature = Column(Double)
    board_temperature = Column(Double)
    fan_rpm = Column(Integer)
    fan_pwm = Column(Integer)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class FootageClip(Base):
    __tablename__ = "footage_clips"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    device_id = Column(String(64), nullable=False, index=True)
    filename = Column(String(256), nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=False, index=True)
    duration_seconds = Column(Double)
    size_bytes = Column(BigInteger)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PowerEvent(Base):
    __tablename__ = "power_events"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    device_id = Column(String(64), nullable=False, index=True)
    event_type = Column(String(16), nullable=False)  # 'power_on' | 'power_off'
    reason = Column(String(256))
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)

class AISnapshot(Base):
    __tablename__ = "ai_snapshots"

    id = Column(BigInteger, primary_key=True, autoincrement=True)

    camera = Column(String(128), nullable=False, index=True)

    # vehicle | human | other
    category = Column(String(32), nullable=False, index=True)

    # car | truck | person | etc.
    label = Column(String(128), nullable=False)

    confidence = Column(Double)

    filename = Column(String(256), nullable=False)

    captured_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class DashboardUser(Base):
    """Persistent dashboard users and per-user page permissions."""

    __tablename__ = "dashboard_users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(128), nullable=False, unique=True, index=True)
    password_hash = Column(String(512), nullable=False)
    role = Column(String(32), nullable=False, default="User")
    permissions = Column(
        __import__("sqlalchemy").JSON,
        nullable=False,
        default=list,
    )
    is_active = Column(
        __import__("sqlalchemy").Boolean,
        nullable=False,
        default=True,
    )
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
