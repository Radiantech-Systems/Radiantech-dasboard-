import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { getDevices } from "../api/client";
import type { DeviceOption } from "../types/telemetry";

interface DeviceContextValue {
  devices: DeviceOption[];
  selectedDeviceId: string;
  selectedDevice: DeviceOption | undefined;
  setSelectedDeviceId: (deviceId: string) => void;
  loadingDevices: boolean;
  refreshDevices: () => Promise<void>;
}

const STORAGE_KEY = "radian-selected-device";

const DeviceContext = createContext<DeviceContextValue | undefined>(
  undefined
);

export function DeviceProvider({ children }: { children: ReactNode }) {
  const [devices, setDevices] = useState<DeviceOption[]>([]);
  const [selectedDeviceId, setSelectedDeviceIdState] = useState(
    () => localStorage.getItem(STORAGE_KEY) || ""
  );
  const [loadingDevices, setLoadingDevices] = useState(true);

  const refreshDevices = useCallback(async () => {
    try {
      const result = await getDevices();

      setDevices(result);

      setSelectedDeviceIdState((current) => {
        const stillExists = result.some(
          (device) => device.device_id === current
        );

        if (stillExists) return current;

        const nextId = result[0]?.device_id || "";
        return nextId;
      });
    } catch (error) {
      console.error("Unable to load registered devices:", error);
    } finally {
      setLoadingDevices(false);
    }
  }, []);

  const setSelectedDeviceId = useCallback((deviceId: string) => {
    setSelectedDeviceIdState(deviceId);
    localStorage.setItem(STORAGE_KEY, deviceId);
  }, []);

  useEffect(() => {
    void refreshDevices();

    const interval = window.setInterval(() => {
      void refreshDevices();
    }, 10000);

    return () => window.clearInterval(interval);
  }, [refreshDevices]);

  useEffect(() => {
    if (selectedDeviceId) {
      localStorage.setItem(STORAGE_KEY, selectedDeviceId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [selectedDeviceId]);

  const selectedDevice = devices.find(
    (device) => device.device_id === selectedDeviceId
  );

  const value = useMemo(
    () => ({
      devices,
      selectedDeviceId,
      selectedDevice,
      setSelectedDeviceId,
      loadingDevices,
      refreshDevices,
    }),
    [
      devices,
      selectedDeviceId,
      selectedDevice,
      setSelectedDeviceId,
      loadingDevices,
      refreshDevices,
    ]
  );

  return (
    <DeviceContext.Provider value={value}>
      {children}
    </DeviceContext.Provider>
  );
}

export function useDevice() {
  const context = useContext(DeviceContext);

  if (!context) {
    throw new Error("useDevice must be used inside DeviceProvider");
  }

  return context;
}
