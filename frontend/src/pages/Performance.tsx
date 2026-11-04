import { useDevice } from "../context/DeviceContext";
import { Grid, Paper, Typography, Stack, LinearProgress, Box } from "@mui/material";
import GaugeChart from "../components/GaugeChart";
import type { useTelemetrySocket } from "../hooks/useTelemetrySocket";

export default function Performance({ socket }: { socket: ReturnType<typeof useTelemetrySocket> }) {
  const { selectedDeviceId } = useDevice();
  const t = socket.byDevice[selectedDeviceId];
  const cpu = t?.cpu;
  const gpu = t?.gpu;
  const mem = t?.memory;
  const storage = t?.storage;

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 3, textAlign: "center" }}>
          <Typography variant="h6">CPU Usage</Typography>
          <GaugeChart label="CPU" value={cpu?.usage_percent} />
          <Typography variant="body2" color="text.secondary">
            {cpu?.frequency_mhz ? `${cpu.frequency_mhz.toFixed(0)} MHz` : "-- MHz"}
          </Typography>
        </Paper>
      </Grid>
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 3, textAlign: "center" }}>
          <Typography variant="h6">GPU Usage</Typography>
          <GaugeChart label="GPU" value={gpu?.usage_percent} color="#7c9cff" />
          <Typography variant="body2" color="text.secondary">
            {gpu?.frequency_mhz ? `${gpu.frequency_mhz.toFixed(0)} MHz` : "-- MHz"}
          </Typography>
        </Paper>
      </Grid>
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 3, textAlign: "center" }}>
          <Typography variant="h6">RAM Usage</Typography>
          <GaugeChart label="RAM" value={mem?.ram_usage_percent} color="#ffb547" />
          <Typography variant="body2" color="text.secondary">
            {mem?.ram_used_mb?.toFixed(0) ?? "--"} / {mem?.ram_total_mb?.toFixed(0) ?? "--"} MB
          </Typography>
        </Paper>
      </Grid>

      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Per-Core CPU Usage</Typography>
          <Stack spacing={1.5}>
            {(cpu?.per_core_usage ?? []).map((usage, idx) => (
              <Box key={idx}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">Core {idx}</Typography>
                  <Typography variant="caption" color="text.secondary">{usage.toFixed(0)}%</Typography>
                </Stack>
                <LinearProgress variant="determinate" value={usage} sx={{ backgroundColor: "rgba(255,255,255,0.06)" }} />
              </Box>
            ))}
            {(!cpu?.per_core_usage || cpu.per_core_usage.length === 0) && (
              <Typography variant="body2" color="text.secondary">Waiting for telemetry…</Typography>
            )}
          </Stack>
        </Paper>
      </Grid>

      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Memory &amp; Storage</Typography>
          <Stack spacing={2}>
            <Box>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2">RAM Free</Typography>
                <Typography variant="body2">{mem?.ram_free_mb?.toFixed(0) ?? "--"} MB</Typography>
              </Stack>
            </Box>
            <Box>
              <Stack direction="row" justifyContent="space-between" mb={0.5}>
                <Typography variant="body2">Storage Used</Typography>
                <Typography variant="body2">
                  {storage?.disk_used_gb?.toFixed(1) ?? "--"} / {storage?.disk_total_gb?.toFixed(1) ?? "--"} GB
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={storage?.disk_usage_percent ?? 0}
                color="warning"
                sx={{ backgroundColor: "rgba(255,255,255,0.06)" }}
              />
            </Box>
            <Box>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2">Storage Free</Typography>
                <Typography variant="body2">{storage?.disk_free_gb?.toFixed(1) ?? "--"} GB</Typography>
              </Stack>
            </Box>
          </Stack>
        </Paper>
      </Grid>
    </Grid>
  );
}
