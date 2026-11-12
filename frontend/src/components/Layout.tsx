import type { ReactNode } from "react";
import type { ConnectionStatus } from "../hooks/useTelemetrySocket";
import { useDevice } from "../context/DeviceContext";
import WorkspaceHeader from "./WorkspaceHeader";
import WorkspaceNav from "./WorkspaceNav";
import CompanyWatermark from "./CompanyWatermark";
import "../styles/drishti.css";

export default function Layout({
  children,
  status,
  userRole = "",
  username,
  permissions = [],
  onLogout,
}: {
  children: ReactNode;
  status: ConnectionStatus;
  userRole?: string;
  username?: string;
  permissions?: string[];
  onLogout: () => void | Promise<void>;
}) {
  const {
    devices,
    selectedDeviceId,
    selectedDevice,
    setSelectedDeviceId,
    loadingDevices,
  } = useDevice();

  return (
    <div className="drishti-workspace">
      <WorkspaceHeader
        username={username}
        role={userRole}
        onLogout={onLogout}
      />

      <WorkspaceNav
        role={userRole}
        permissions={permissions}
      />

      <main className="drishti-workspace-content">
        <div className="drishti-workspace-tools">
          <div className="drishti-device-control">
            <label htmlFor="workspace-device">
              Active device
            </label>

            <select
              id="workspace-device"
              value={selectedDeviceId}
              onChange={(event) =>
                setSelectedDeviceId(event.target.value)
              }
              disabled={loadingDevices || devices.length === 0}
            >
              {devices.length === 0 && (
                <option value="">
                  {loadingDevices
                    ? "Loading devices..."
                    : "No devices registered"}
                </option>
              )}

              {devices.map((device) => (
                <option
                  key={device.device_id}
                  value={device.device_id}
                >
                  {device.device_name || device.device_id} (
                  {device.device_id})
                </option>
              ))}
            </select>

            {selectedDevice && (
              <span className="drishti-device-status">
                {selectedDevice.status.toUpperCase()}
              </span>
              )}
              {selectedDevice?.location?.trim() && (
                <span className="drishti-device-location">
                  <span aria-hidden="true">📍</span> {selectedDevice.location}
                </span>
              )}
          </div>

          {userRole !== "User" && (
            <div
              className="drishti-workspace-telemetry"
              role="status"
            >
              Telemetry: {status}
            </div>
          )}
        </div>

        {children}
      </main>

      <CompanyWatermark />
    </div>
  );
}
