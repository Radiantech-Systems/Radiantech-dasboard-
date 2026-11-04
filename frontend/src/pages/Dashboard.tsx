import { useDevice } from "../context/DeviceContext";
import { useEffect, useState } from "react";

import {
  Grid,
  Paper,
  Stack,
  Typography,
  Chip,
  Box,
} from "@mui/material";

import MemoryIcon from "@mui/icons-material/MemoryOutlined";
import DeveloperBoardIcon from "@mui/icons-material/DeveloperBoardOutlined";
import StorageIcon from "@mui/icons-material/StorageOutlined";
import ThermostatIcon from "@mui/icons-material/ThermostatOutlined";
import AirIcon from "@mui/icons-material/AirOutlined";
import BoltIcon from "@mui/icons-material/BoltOutlined";

import StatCard from "../components/StatCard";

import { getDashboard } from "../api/client";

import type { DeviceSummary } from "../types/telemetry";
import type { useTelemetrySocket } from "../hooks/useTelemetrySocket";

export default function Dashboard({
  socket,
}: {
  socket: ReturnType<typeof useTelemetrySocket>;
}) {
  const { selectedDeviceId } = useDevice();
  const [devices, setDevices] = useState<DeviceSummary[]>([]);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    let active = true;

    async function poll() {
      try {
        const res = await getDashboard();

        if (active) {
          setDevices(res.devices);
        }
      } catch {
        // Keep last known values.
      }
    }

    poll();

    const id = setInterval(poll, 2000);

    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(
      () => setNow(new Date()),
      1000
    );

    return () => clearInterval(id);
  }, []);

  const live = socket.byDevice[selectedDeviceId];
  const device = devices.find(
    (item) => item.device_id === selectedDeviceId
  );

  const isOnline =
    device?.status === "online" ||
    (live !== undefined &&
      socket.status === "connected");

  return (
    <Stack
      spacing={{
        xs: 1.5,
        sm: 2,
        md: 3,
      }}
      sx={{
        width: "100%",
        minWidth: 0,
      }}
    >
      {/* =====================================================
          DEVICE HEADER
          ===================================================== */}
      <Paper
        sx={{
          width: "100%",
          minWidth: 0,
          p: {
            xs: 1.5,
            sm: 2,
            md: 3,
          },
        }}
      >
        <Stack
          direction={{
            xs: "column",
            sm: "row",
          }}
          justifyContent="space-between"
          alignItems={{
            xs: "stretch",
            sm: "center",
          }}
          gap={{
            xs: 1.5,
            sm: 2,
          }}
        >
          <Box
            sx={{
              minWidth: 0,
              flex: 1,
            }}
          >
            <Typography
              variant="h5"
              sx={{
                overflowWrap: "anywhere",
              }}
            >
              {live?.system_info?.device_name ||
                device?.device_name ||
                "Selected Device"}
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                overflowWrap: "anywhere",
              }}
            >
              {live?.system_info?.hostname ||
                device?.device_id ||
                "Waiting for telemetry..."}
            </Typography>
          </Box>

          <Stack
            alignItems={{
              xs: "flex-start",
              sm: "flex-end",
            }}
            spacing={0.5}
            sx={{
              flexShrink: 0,
            }}
          >
            <Chip
              label={
                isOnline ? "ONLINE" : "OFFLINE"
              }
              color={
                isOnline ? "success" : "error"
              }
              sx={{
                fontWeight: 700,
                px: 1,
              }}
            />

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                whiteSpace: "nowrap",
              }}
            >
              Last update:{" "}
              {now.toLocaleTimeString()}
            </Typography>
          </Stack>
        </Stack>
      </Paper>

      {/* =====================================================
          STAT CARDS
          ===================================================== */}
      <Grid
        container
        spacing={{
          xs: 1.5,
          sm: 2,
          md: 3,
        }}
        sx={{
          width: "100%",
          minWidth: 0,
          margin: 0,
        }}
      >
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="CPU"
            value={
              live?.cpu?.usage_percent?.toFixed(0) ??
              device?.cpu_usage_percent?.toFixed(0)
            }
            unit="%"
            icon={<MemoryIcon />}
            progress={
              live?.cpu?.usage_percent ??
              device?.cpu_usage_percent
            }
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="GPU"
            value={
              live?.gpu?.usage_percent?.toFixed(0) ??
              device?.gpu_usage_percent?.toFixed(0)
            }
            unit="%"
            icon={<DeveloperBoardIcon />}
            progress={
              live?.gpu?.usage_percent ??
              device?.gpu_usage_percent
            }
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="RAM"
            value={
              live?.memory?.ram_usage_percent?.toFixed(0) ??
              device?.ram_usage_percent?.toFixed(0)
            }
            unit="%"
            icon={<MemoryIcon />}
            progress={
              live?.memory?.ram_usage_percent ??
              device?.ram_usage_percent
            }
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Storage"
            value={
              live?.storage?.disk_usage_percent?.toFixed(0) ??
              device?.disk_usage_percent?.toFixed(0)
            }
            unit="%"
            icon={<StorageIcon />}
            progress={
              live?.storage?.disk_usage_percent ??
              device?.disk_usage_percent
            }
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="CPU Temperature"
            value={
              live?.cpu?.temperature_c?.toFixed(1) ??
              device?.cpu_temperature_c?.toFixed(1)
            }
            unit="°C"
            icon={<ThermostatIcon />}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="GPU Temperature"
            value={
              live?.gpu?.temperature_c?.toFixed(1) ??
              device?.gpu_temperature_c?.toFixed(1)
            }
            unit="°C"
            icon={<ThermostatIcon />}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Fan"
            value={
              live?.cooling?.fan_rpm ??
              device?.fan_rpm
            }
            unit="RPM"
            icon={<AirIcon />}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Power"
            value={
              live?.power?.power_consumption_mw
                ? (
                    live.power
                      .power_consumption_mw / 1000
                  ).toFixed(2)
                : device?.power_consumption_mw
                ? (
                    device.power_consumption_mw /
                    1000
                  ).toFixed(2)
                : null
            }
            unit="W"
            subtitle={
              live?.power?.power_mode ||
              device?.power_mode ||
              undefined
            }
            icon={<BoltIcon />}
          />
        </Grid>
      </Grid>
    </Stack>
  );
}
