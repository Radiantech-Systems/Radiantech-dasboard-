import { useState } from "react";
import { Paper, Typography, Stack, TextField, Button, Alert, Divider } from "@mui/material";
import { API_URL, WS_URL } from "../api/client";

export default function Settings() {
  const [saved, setSaved] = useState(false);

  return (
    <Stack spacing={3} sx={{ width: "100%", maxWidth: 640, minWidth: 0 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Connection</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          The dashboard connects to the FastAPI backend running on the Ubuntu
          server. These values are set at build/deploy time via environment
          variables (<code>VITE_API_URL</code>, <code>VITE_WS_URL</code>) — shown
          here read-only for reference.
        </Typography>
        <Stack spacing={2}>
          <TextField label="REST API URL" value={API_URL} InputProps={{ readOnly: true }} fullWidth size="small" />
          <TextField label="WebSocket URL" value={WS_URL} InputProps={{ readOnly: true }} fullWidth size="small" />
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Data Retention</Typography>
        <Typography variant="body2" color="text.secondary">
          Only temperature and cooling readings are stored historically, in the
          <code> temperature_history</code> table on the server. All other metrics
          (CPU/GPU/RAM/Storage/Power/Network/Camera) are live-only and are never
          written to the database.
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Button
          variant="outlined"
          onClick={() => setSaved(true)}
        >
          Acknowledge
        </Button>
        {saved && <Alert severity="success" sx={{ mt: 2 }}>Preferences acknowledged for this session.</Alert>}
      </Paper>
    </Stack>
  );
}
