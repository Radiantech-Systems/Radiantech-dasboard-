import { useState } from "react";
import { Box, Typography, CircularProgress, Alert } from "@mui/material";

interface MjpegPlayerProps {
  /** Full URL to the MJPEG stream, e.g. http://<jetson-ip>:5001/video_feed */
  streamUrl: string;
}

/**
 * Displays a live MJPEG stream — the format the Jetson's Flask server
 * (live_stream_server.py) produces. Browsers can render this natively
 * with a plain <img> tag; no HLS.js or media server needed.
 */
export default function MjpegPlayer({ streamUrl }: MjpegPlayerProps) {
  const [status, setStatus] = useState<"loading" | "playing" | "error">("loading");
  // Bust the browser's image cache on retry so a fresh connection attempt is made.
  const [attempt, setAttempt] = useState(0);

  return (
    <Box sx={{ position: "relative", width: "100%", aspectRatio: "16 / 9", backgroundColor: "#000", borderRadius: 2, overflow: "hidden" }}>
      <img
        key={attempt}
        src={`${streamUrl}${streamUrl.includes("?") ? "&" : "?"}_=${attempt}`}
        alt="Live camera feed"
        style={{ width: "100%", height: "100%", objectFit: "contain", display: status === "error" ? "none" : "block" }}
        onLoad={() => setStatus("playing")}
        onError={() => setStatus("error")}
      />
      {status === "loading" && (
        <Box sx={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1 }}>
          <CircularProgress size={28} />
          <Typography variant="caption" color="text.secondary">Connecting to camera…</Typography>
        </Box>
      )}
      {status === "error" && (
        <Box
          sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", p: 2, cursor: "pointer" }}
          onClick={() => { setStatus("loading"); setAttempt((a) => a + 1); }}
        >
          <Alert severity="warning" sx={{ maxWidth: 360 }}>
            Stream unavailable — check the Jetson's live-stream service is running. Click to retry.
          </Alert>
        </Box>
      )}
    </Box>
  );
}
