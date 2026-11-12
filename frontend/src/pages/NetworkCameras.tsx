import CameraWorkspace from "../components/CameraWorkspace";
import type { useTelemetrySocket } from "../hooks/useTelemetrySocket";

export default function NetworkCameras({
  socket,
}: {
  socket: ReturnType<typeof useTelemetrySocket>;
}) {
  return <CameraWorkspace socket={socket} />;
}
