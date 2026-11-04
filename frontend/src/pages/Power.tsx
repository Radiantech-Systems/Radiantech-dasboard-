import { useDevice } from "../context/DeviceContext";
import { useEffect, useState } from "react";
import {
  Grid, Paper, Typography, Chip, Stack, ToggleButton, ToggleButtonGroup,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
} from "@mui/material";
import StatCard from "../components/StatCard";
import BoltIcon from "@mui/icons-material/BoltOutlined";
import TuneIcon from "@mui/icons-material/TuneOutlined";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNewOutlined";
import { getPowerEvents } from "../api/client";
import type { RangePreset } from "../api/client";
import type { PowerEvent } from "../types/telemetry";
import type { useTelemetrySocket } from "../hooks/useTelemetrySocket";

export default function Power({ socket }: { socket: ReturnType<typeof useTelemetrySocket> }) {
  const { selectedDeviceId } = useDevice();
  const power = socket.byDevice[selectedDeviceId]?.power;
  const stm32 = socket.byDevice[selectedDeviceId]?.stm32;

  const [range, setRange] = useState<Exclude<RangePreset, "custom">>("last_day");
  const [events, setEvents] = useState<PowerEvent[]>([]);
  const [loading, setLoading] = useState(false);

  async function fetchEvents() {
    setLoading(true);
    try {
      const data = await getPowerEvents({ deviceId: selectedDeviceId, range });
      setEvents(data);
    } catch {
      // keep last known list on a transient error
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEvents();
    const id = setInterval(fetchEvents, 10000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, selectedDeviceId]);

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Power Consumption"
          value={power?.power_consumption_mw ? (power.power_consumption_mw / 1000).toFixed(2) : null}
          unit="W"
          icon={<BoltIcon />}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Paper sx={{ p: 3, height: "100%" }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle2" color="text.secondary">Power Mode</Typography>
            <TuneIcon sx={{ color: "primary.main", opacity: 0.85 }} />
          </Stack>
          <Chip label={power?.power_mode ?? "--"} sx={{ mt: 1.5, fontWeight: 600 }} color="primary" variant="outlined" />
        </Paper>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="STM32 Input Voltage"
          value={stm32?.voltage ?? null}
          unit="V"
          subtitle="Future integration"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="STM32 Current"
          value={stm32?.current ?? null}
          unit="A"
          subtitle="Future integration"
        />
      </Grid>

      <Grid item xs={12}>
        <Paper sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={2}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <PowerSettingsNewIcon sx={{ color: "primary.main" }} />
              <Typography variant="h6">Subsystem Power Details</Typography>
            </Stack>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={range}
              onChange={(_, v) => v && setRange(v)}
            >
              <ToggleButton value="last_hour">Last Hour</ToggleButton>
              <ToggleButton value="last_day">Last Day</ToggleButton>
              <ToggleButton value="last_week">Last Week</ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Power on/off log for this device, with timestamp and (for power-off events) a reason.
            {loading ? " (refreshing…)" : ""}
          </Typography>

          <TableContainer sx={{ maxHeight: 420 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Device</TableCell>
                  <TableCell>Event</TableCell>
                  <TableCell>Reason</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {events.map((ev) => {
                  const d = new Date(ev.timestamp);
                  return (
                    <TableRow key={ev.id} hover>
                      <TableCell>{d.toLocaleDateString()}</TableCell>
                      <TableCell>{d.toLocaleTimeString()}</TableCell>
                      <TableCell>{ev.device_id}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={ev.event_type === "power_on" ? "POWER ON" : "POWER OFF"}
                          color={ev.event_type === "power_on" ? "success" : "error"}
                        />
                      </TableCell>
                      <TableCell>{ev.reason ?? "--"}</TableCell>
                    </TableRow>
                  );
                })}
                {events.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Typography variant="body2" color="text.secondary">
                        No power events for this range yet.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Grid>
    </Grid>
  );
}
