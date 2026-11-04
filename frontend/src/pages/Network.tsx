import { useDevice } from "../context/DeviceContext";
import {
  Grid,
  Paper,
  Typography,
  Stack,
  Chip,
} from "@mui/material";

import WifiIcon from "@mui/icons-material/WifiOutlined";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpwardOutlined";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownwardOutlined";

import StatCard from "../components/StatCard";
import type { useTelemetrySocket } from "../hooks/useTelemetrySocket";

export default function Network({ socket }: {
  socket: ReturnType<typeof useTelemetrySocket>;
}) {
  const { selectedDeviceId } = useDevice();
  const network = socket.byDevice[selectedDeviceId]?.network;

  return (
    <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}
      sx={{ width: "100%", minWidth: 0, margin: 0 }}>
      {/* =====================================================
          ETHERNET
          ===================================================== */}
      <Grid item xs={12} md={6}>
        <Paper
          sx={{
            p: {
              xs: 1.5,
              sm: 2,
              md: 3,
            },
            width: "100%",
            minWidth: 0,
          }}
        >
          <Stack
            direction={{
              xs: "column",
              sm: "row",
            }}
            alignItems={{
              xs: "flex-start",
              sm: "center",
            }}
            spacing={1}
            mb={2}
          >
            <WifiIcon
              sx={{
                color: "primary.main",
              }}
            />

            <Typography variant="h6">
              Ethernet
            </Typography>

            <Chip
              size="small"
              label={
                network?.ethernet_status
                  ?.toUpperCase() ?? "--"
              }
              color={
                network?.ethernet_status === "up"
                  ? "success"
                  : "error"
              }
            />
          </Stack>

          <Stack spacing={1.25}>
            <Row
              label="IP Address"
              value={network?.ip_address}
            />

            <Row
              label="MAC Address"
              value={network?.mac_address}
            />
          </Stack>
        </Paper>
      </Grid>

      {/* =====================================================
          UPLOAD
          ===================================================== */}
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Upload Speed"
          value={network?.upload_speed_kbps?.toFixed(0)}
          unit="kbps"
          icon={<ArrowUpwardIcon />}
        />
      </Grid>

      {/* =====================================================
          DOWNLOAD
          ===================================================== */}
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Download Speed"
          value={network?.download_speed_kbps?.toFixed(0)}
          unit="kbps"
          icon={<ArrowDownwardIcon />}
        />
      </Grid>


    </Grid>
  );
}

function Row({ label, value }: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }}
      justifyContent="space-between" gap={0.5} sx={{ minWidth: 0 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={600}
        sx={{ overflowWrap: "anywhere", wordBreak: "break-word",
          textAlign: { xs: "left", sm: "right" } }}>
        {value ?? "--"}
      </Typography>
    </Stack>
  );
}
