import axios from "axios";
import type {
  DeviceSummary,
  DeviceOption,
  TemperatureHistoryPoint,
  FootageClip,
  PowerEvent,
  AISnapshot,
} from "../types/telemetry";

export const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000";


export const WS_URL =
  import.meta.env.VITE_WS_URL ||
  "ws://localhost:8000/ws/telemetry";

const client = axios.create({
  baseURL: API_URL,
  timeout: 8000,
  withCredentials: true,
});


// =========================
// Authentication
// =========================

export interface AuthResponse {
  authenticated: boolean;
  username?: string;
  role?: string;
  permissions?: string[];
}

export interface DashboardUser {
  id: number;
  username: string;
  role: string;
  permissions: string[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PermissionCatalog {
  permissions: string[];
  role_defaults: Record<string, string[]>;
}

export async function login(
  username: string,
  password: string,
  role: "Admin" | "User" | "IT"
): Promise<AuthResponse> {
  const { data } = await client.post<AuthResponse>("/auth/login", {
    username,
    password,
    role,
  });

  return data;
}

export async function getCurrentUser(): Promise<AuthResponse> {
  const { data } = await client.get<AuthResponse>("/auth/me");
  return data;
}

export async function logout(): Promise<void> {
  await client.post("/auth/logout");
}

export async function getUsers(): Promise<DashboardUser[]> {
  const { data } = await client.get<{ users: DashboardUser[] }>("/auth/users");
  return data.users;
}

export async function getPermissionCatalog(): Promise<PermissionCatalog> {
  const { data } = await client.get<PermissionCatalog>("/auth/permissions");
  return data;
}

export async function createUser(payload: {
  username: string;
  password: string;
  role: string;
  permissions: string[];
}): Promise<DashboardUser> {
  const { data } = await client.post<DashboardUser>("/auth/users", payload);
  return data;
}

export async function updateUser(
  userId: number,
  payload: {
    password?: string;
    role?: string;
    permissions?: string[];
    is_active?: boolean;
  }
): Promise<DashboardUser> {
  const { data } = await client.patch<DashboardUser>(
    `/auth/users/${userId}`,
    payload
  );
  return data;
}



// =========================
// AI Snapshots
// =========================

export async function getAISnapshots(params?: {
  category?: "vehicle" | "human" | "other";
  camera?: string;
  limit?: number;
}): Promise<AISnapshot[]> {
  const { data } = await client.get("/ai-snapshots", {
    params,
  });

  return data;
}

export function aiSnapshotImageUrl(relativeUrl: string): string {
  if (
    relativeUrl.startsWith("http://") ||
    relativeUrl.startsWith("https://")
  ) {
    return relativeUrl;
  }

  return `${API_URL}${relativeUrl}`;
}


// =========================
// Dashboard
// =========================

export async function getDashboard(): Promise<{
  devices: DeviceSummary[];
}> {
  const { data } = await client.get("/dashboard");
  return data;
}

export async function getDevices(): Promise<DeviceOption[]> {
  const { data } = await client.get<{ devices: DeviceOption[] }>("/devices");
  return data.devices;
}


// =========================
// System Information
// =========================

export async function getSystemInfo(deviceId?: string) {
  const { data } = await client.get("/system-info", {
    params: {
      device_id: deviceId,
    },
  });

  return data;
}


// =========================
// Performance
// =========================

export async function getPerformance(deviceId?: string) {
  const { data } = await client.get("/performance", {
    params: {
      device_id: deviceId,
    },
  });

  return data;
}


// =========================
// Power
// =========================

export async function getPower(deviceId?: string) {
  const { data } = await client.get("/power", {
    params: {
      device_id: deviceId,
    },
  });

  return data;
}


// =========================
// Network
// =========================

export async function getNetwork(deviceId?: string) {
  const { data } = await client.get("/network", {
    params: {
      device_id: deviceId,
    },
  });

  return data;
}


// =========================
// Temperature
// =========================

export type RangePreset =
  | "last_hour"
  | "last_day"
  | "last_week"
  | "custom";

export async function getTemperatureHistory(params: {
  deviceId?: string;
  range?: Exclude<RangePreset, "custom">;
  start?: string;
  end?: string;
}): Promise<TemperatureHistoryPoint[]> {
  const { data } = await client.get("/temperature/history", {
    params: {
      device_id: params.deviceId,
      range: params.range,
      start: params.start,
      end: params.end,
    },
  });

  return data;
}

export function buildTemperatureExportUrl(params: {
  deviceId?: string;
  range?: Exclude<RangePreset, "custom">;
  start?: string;
  end?: string;
}): string {
  const search = new URLSearchParams();

  if (params.deviceId) {
    search.set("device_id", params.deviceId);
  }

  if (params.range) {
    search.set("range", params.range);
  }

  if (params.start) {
    search.set("start", params.start);
  }

  if (params.end) {
    search.set("end", params.end);
  }

  return `${API_URL}/temperature/history/export?${search.toString()}`;
}


// =========================
// Recorded Footage
// =========================

export async function getFootage(params: {
  deviceId: string;
  range?: Exclude<RangePreset, "custom">;
  start?: string;
  end?: string;
}): Promise<FootageClip[]> {
  const deviceId = params.deviceId;
  if (!deviceId) throw new Error("A device must be selected before loading footage.");

  // Create a metadata request for the Jetson.
  const { data: request } = await client.post(
    "/video-commands/request",
    {
      device_id: deviceId,
      since: null,
    }
  );

  const requestId = request.request_id;

  // Wait for the Jetson to return metadata.
  const deadline = Date.now() + 10000;

  while (Date.now() < deadline) {
    const { data: result } = await client.get(
      `/video-commands/result/${requestId}`
    );

    if (result.status === "ready") {
      const videos = result.data?.videos || [];

      let clips: FootageClip[] = videos.map(
        (video: {
          name: string;
          path: string;
          size: number;
          modified: string;
        }) => ({
          id: stableFootageId(video.name),
          device_id: result.device_id || deviceId,
          filename: video.name,
          started_at: video.modified,
          duration_seconds: null,
          size_bytes: video.size,
          url: `/video/${encodeURIComponent(video.path)}`,
        })
      );

      // Apply the existing range buttons locally.
      if (params.range) {
        const now = Date.now();

        const rangeMs: Record<
          Exclude<RangePreset, "custom">,
          number
        > = {
          last_hour: 60 * 60 * 1000,
          last_day: 24 * 60 * 60 * 1000,
          last_week: 7 * 24 * 60 * 60 * 1000,
        };

        const cutoff = now - rangeMs[params.range];

        clips = clips.filter(
          (clip) =>
            new Date(clip.started_at).getTime() >= cutoff
        );
      }

      return clips;
    }

    await new Promise((resolve) =>
      setTimeout(resolve, 500)
    );
  }

  return [];
}

function stableFootageId(filename: string): number {
  let hash = 0;

  for (let i = 0; i < filename.length; i++) {
    hash =
      (hash << 5) -
      hash +
      filename.charCodeAt(i);

    hash |= 0;
  }

  return Math.abs(hash);
}

export function footageClipUrl(relativeUrl: string, deviceId: string): string {
  if (
    relativeUrl.startsWith("http://") ||
    relativeUrl.startsWith("https://")
  ) {
    return relativeUrl;
  }

  const cleanPath = relativeUrl
    .replace(/^\/video\//, "")
    .replace(/^\/+/, "");

  return `${API_URL}/video-stream/${encodeURIComponent(deviceId)}/${cleanPath}`;
}


// =========================
// Power Events
// =========================

export async function getPowerEvents(params: {
  deviceId?: string;
  range?: Exclude<RangePreset, "custom">;
  start?: string;
  end?: string;
}): Promise<PowerEvent[]> {
  const { data } = await client.get("/power/events", {
    params: {
      device_id: params.deviceId,
      range: params.range,
      start: params.start,
      end: params.end,
    },
  });

  return data;
}


export default client;
