import { useDevice } from "../context/DeviceContext";
import { Grid, Paper, Typography, Stack, Divider } from "@mui/material";
import type { useTelemetrySocket } from "../hooks/useTelemetrySocket";

function Row({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={0.5} sx={{ py: 1.25, minWidth: 0 }}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 0, overflowWrap: "anywhere" }}>{label}</Typography>
      <Typography variant="body2" fontWeight={600} sx={{ minWidth: 0, overflowWrap: "anywhere", wordBreak: "break-word", textAlign: { xs: "left", sm: "right" } }}>{value ?? "--"}</Typography>
    </Stack>
  );
}

function formatUptime(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "--";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

export default function SystemInformation({ socket }: { socket: ReturnType<typeof useTelemetrySocket> }) {
  const { selectedDeviceId } = useDevice();
  const info = socket.byDevice[selectedDeviceId]?.system_info;

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={7}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Device Identity</Typography>
          <Divider sx={{ mb: 1 }} />
          <Row label="Device Name" value={info?.device_name} />
          <Divider />
          <Row label="Device ID" value={info?.device_id} />
          <Divider />
          <Row label="Hostname" value={info?.hostname} />
          <Divider />
          <Row label="JetPack Version" value={info?.jetpack_version} />
          <Divider />
          <Row label="Ubuntu Version" value={info?.ubuntu_version} />
          <Divider />
          <Row label="Kernel Version" value={info?.kernel_version} />
        </Paper>
      </Grid>
      <Grid item xs={12} md={5}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Runtime</Typography>
          <Divider sx={{ mb: 1 }} />
          <Row label="Boot Time" value={info?.boot_time} />
          <Divider />
          <Row label="Uptime" value={formatUptime(info?.uptime_seconds)} />
        </Paper>
      </Grid>
    </Grid>
  );
}
