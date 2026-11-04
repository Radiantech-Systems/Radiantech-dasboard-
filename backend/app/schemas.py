"""
Pydantic schemas.

TelemetryPayload is the full document the Jetson agent POSTs every
second. It intentionally mirrors the collector modules on the agent
side 1:1 so no translation layer is needed.
"""
from __future__ import annotations
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class SystemInfo(BaseModel):
    device_name: str
    device_id: str
    hostname: str
    jetpack_version: Optional[str] = None
    ubuntu_version: Optional[str] = None
    kernel_version: Optional[str] = None
    boot_time: Optional[str] = None
    uptime_seconds: Optional[float] = None


class CpuInfo(BaseModel):
    usage_percent: Optional[float] = None
    per_core_usage: Optional[List[float]] = None
    frequency_mhz: Optional[float] = None
    temperature_c: Optional[float] = None


class GpuInfo(BaseModel):
    usage_percent: Optional[float] = None
    frequency_mhz: Optional[float] = None
    temperature_c: Optional[float] = None


class MemoryInfo(BaseModel):
    ram_used_mb: Optional[float] = None
    ram_free_mb: Optional[float] = None
    ram_total_mb: Optional[float] = None
    ram_usage_percent: Optional[float] = None
    swap_used_mb: Optional[float] = None


class StorageInfo(BaseModel):
    disk_used_gb: Optional[float] = None
    disk_free_gb: Optional[float] = None
    disk_total_gb: Optional[float] = None
    disk_usage_percent: Optional[float] = None


class PowerInfo(BaseModel):
    power_mode: Optional[str] = None
    power_consumption_mw: Optional[float] = None
    input_voltage_mv: Optional[float] = None   # future
    current_ma: Optional[float] = None         # future


class CoolingInfo(BaseModel):
    fan_rpm: Optional[int] = None
    fan_pwm: Optional[int] = None
    board_temperature_c: Optional[float] = None


class NetworkInfo(BaseModel):
    ethernet_status: Optional[str] = None
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    upload_speed_kbps: Optional[float] = None
    download_speed_kbps: Optional[float] = None


class CameraInfo(BaseModel):
    name: str
    status: str
    resolution: Optional[str] = None
    fps: Optional[str] = None


class Stm32Info(BaseModel):
    voltage: Optional[float] = None
    current: Optional[float] = None
    pgood: Optional[bool] = None
    watchdog_ok: Optional[bool] = None


class TelemetryPayload(BaseModel):
    system_info: SystemInfo
    cpu: CpuInfo
    gpu: GpuInfo
    memory: MemoryInfo
    storage: StorageInfo
    power: PowerInfo
    cooling: CoolingInfo
    network: NetworkInfo
    cameras: List[CameraInfo] = []
    stm32: Optional[Stm32Info] = None
    timestamp: Optional[datetime] = None


class TemperatureHistoryOut(BaseModel):
    device_id: str
    cpu_temperature: Optional[float]
    gpu_temperature: Optional[float]
    board_temperature: Optional[float]
    fan_rpm: Optional[int]
    fan_pwm: Optional[int]
    timestamp: datetime

    class Config:
        from_attributes = True


class DeviceOut(BaseModel):
    device_id: str
    device_name: str
    hostname: Optional[str]
    ip_address: Optional[str]
    status: str
    last_seen: Optional[datetime]

    class Config:
        from_attributes = True


class FootageClipOut(BaseModel):
    id: int
    device_id: str
    filename: str
    started_at: datetime
    duration_seconds: Optional[float]
    size_bytes: Optional[int]
    url: str  # relative path the frontend prepends its API base to

    class Config:
        from_attributes = True


class PowerEventIn(BaseModel):
    device_id: str
    event_type: str  # 'power_on' | 'power_off'
    reason: Optional[str] = None


class PowerEventOut(BaseModel):
    id: int
    device_id: str
    event_type: str
    reason: Optional[str]
    timestamp: datetime

    class Config:
        from_attributes = True

