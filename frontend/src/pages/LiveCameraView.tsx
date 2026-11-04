import { useParams, Link as RouterLink } from "react-router-dom";
import { Box, Typography, Stack, Alert, Link as MuiLink } from "@mui/material";
import VideoPlayer from "../components/VideoPlayer";
import MjpegPlayer from "../components/MjpegPlayer";
import { CCTV_STREAMS } from "../config/cctvStreams";

/**
 * Direct, shareable, auto-playing live view — e.g.
 *   http://<server>:8080/live/jetson_camera
 * Opens straight to the stream, no navigating through Network & Cameras
 * or clicking "View Live" first. Bookmark or share this URL directly.
 */
export default function LiveCameraView() {
  const { cameraPath } = useParams<{ cameraPath: string }>();
  const stream = CCTV_STREAMS.find((s) => s.path === cameraPath);

  if (!stream) {
    return (
      <Box sx={{ maxWidth: 480 }}>
        <Alert severity="warning">
          No camera configured with the path "{cameraPath}". Check{" "}
          <code>frontend/src/config/cctvStreams.ts</code>.
        </Alert>
        <MuiLink component={RouterLink} to="/network-cameras" sx={{ mt: 2, display: "inline-block" }}>
          ← Back to Network &amp; Cameras
        </MuiLink>
      </Box>
    );
  }

  return (
    <Stack spacing={2} sx={{ maxWidth: 960 }}>
      <Typography variant="h5">{stream.label} — Live</Typography>
      {stream.source === "mjpeg" && stream.streamUrl && <MjpegPlayer streamUrl={stream.streamUrl} />}
      {stream.source === "mediamtx" && <VideoPlayer cameraPath={stream.path} />}
      <MuiLink component={RouterLink} to="/network-cameras">
        ← Back to Network &amp; Cameras
      </MuiLink>
    </Stack>
  );
}
