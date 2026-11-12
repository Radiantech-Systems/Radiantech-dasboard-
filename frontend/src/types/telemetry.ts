export interface SystemInfo {
  device_name: string;
  device_id: string;
  hostname: string;
  jetpack_version: string | null;
  ubuntu_version: string | null;
  kernel_version: string | null;
  boot_time: string | null;
  uptime_seconds: number | null;
}

export interface CpuInfo {
  usage_percent: number | null;
  per_core_usage: number[] | null;
  frequency_mhz: number | null;
  temperature_c: number | null;
}

export interface GpuInfo {
  usage_percent: number | null;
  frequency_mhz: number | null;
  temperature_c: number | null;
}

export interface MemoryInfo {
  ram_used_mb: number | null;
  ram_free_mb: number | null;
  ram_total_mb: number | null;
  ram_usage_percent: number | null;
  swap_used_mb: number | null;
}

export interface StorageInfo {
  disk_used_gb: number | null;
  disk_free_gb: number | null;
  disk_total_gb: number | null;
  disk_usage_percent: number | null;
}

export interface PowerInfo {
  power_mode: string | null;
  power_consumption_mw: number | null;
  input_voltage_mv: number | null;
  current_ma: number | null;
}

export interface CoolingInfo {
  fan_rpm: number | null;
  fan_pwm: number | null;
  board_temperature_c: number | null;
}

export interface NetworkInfo {
  ethernet_status: string | null;
  ip_address: string | null;
  mac_address: string | null;
  upload_speed_kbps: number | null;
  download_speed_kbps: number | null;
}

export interface CameraInfo {
  name: string;
  status: string;
  resolution: string | null;
  fps: string | null;
}

export interface Stm32Info {
  voltage: number | null;
  current: number | null;
  pgood: boolean | null;
  watchdog_ok: boolean | null;
}

export interface TelemetryPayload {
  system_info: SystemInfo;
  cpu: CpuInfo;
  gpu: GpuInfo;
  memory: MemoryInfo;
  storage: StorageInfo;
  power: PowerInfo;
  cooling: CoolingInfo;
  network: NetworkInfo;
  cameras: CameraInfo[];
  stm32: Stm32Info | null;
  timestamp: string | null;
  server_received_at?: string;
}

export interface TemperatureHistoryPoint {
  device_id: string;
  cpu_temperature: number | null;
  gpu_temperature: number | null;
  board_temperature: number | null;
  fan_rpm: number | null;
  fan_pwm: number | null;
  timestamp: string;
}

export interface FootageClip {
  id: number;
  device_id: string;
  filename: string;
  started_at: string;
  duration_seconds: number | null;
  size_bytes: number | null;
  url: string; // relative — prepend API_URL to play/download
}

export interface AISnapshot {
  id: number;
  camera: string;
  category: "vehicle" | "human" | "other";
  label: string;
  confidence: number | null;
  captured_at: string;
  image_url: string;
}

export interface PowerEvent {
  id: number;
  device_id: string;
  event_type: "power_on" | "power_off";
  reason: string | null;
  timestamp: string;
}

export interface DeviceSummary {
  device_id: string;
  device_name: string;
  status: "online" | "offline";
  last_seen: string | null;
  cpu_usage_percent: number | null;
  gpu_usage_percent: number | null;
  ram_usage_percent: number | null;
  disk_usage_percent: number | null;
  cpu_temperature_c: number | null;
  gpu_temperature_c: number | null;
  fan_rpm: number | null;
  power_consumption_mw: number | null;
  power_mode: string | null;
}


export interface DeviceOption {
  device_id: string;
  device_name: string;
  location?: string | null;
  status: "online" | "offline";
  last_seen: string | null;
}
