import { useState } from "react";
import { Link } from "react-router-dom";
import { useDevice } from "../context/DeviceContext";
import type { useTelemetrySocket } from "../hooks/useTelemetrySocket";
import VideoPlayer from "../components/VideoPlayer";
import { CAMERA_DEPLOYMENTS } from "../config/cameraDeployments";
import "../styles/cameras.css";

export default function CameraWorkspace({
  socket,
}: {
  socket?: ReturnType<typeof useTelemetrySocket>;
}) {
  const { selectedDeviceId, selectedDevice } = useDevice();
  const [selectedId, setSelectedId] = useState(
    CAMERA_DEPLOYMENTS[0]?.id ?? ""
  );
  const [view, setView] = useState<"live" | "footage">("live");
  const [activePath, setActivePath] = useState<string | null>(null);

  const selected = CAMERA_DEPLOYMENTS.find(
    (camera) => camera.id === selectedId
  );
  const areas = [
    ...new Set(CAMERA_DEPLOYMENTS.map((camera) => camera.area)),
  ];
  const onboard =
    socket?.byDevice[selectedDeviceId]?.cameras ?? [];

  return (
    <section className="cameras-page" aria-labelledby="cameras-heading">
      <header>
        
        <h1 id="cameras-heading">Camera</h1>
        <p>
          Select a camera to view its raw and AI-processed streams.
        </p>
      </header>

      <div
        className="camera-tabs"
        role="group"
        aria-label="Camera views"
      >
        <button
          type="button"
          aria-pressed={view === "live"}
          onClick={() => setView("live")}
        >
          Live streams
        </button>
        <button
          type="button"
          aria-pressed={view === "footage"}
          onClick={() => { setActivePath(null); setView("footage"); }}
        >
          Footage
        </button>
      </div>

      <div className="camera-workspace">
        <aside
          className="camera-tree"
          aria-label="Camera deployment tree"
        >
          <h2>Camera locations</h2>

          {areas.map((area) => {
            const cameras = CAMERA_DEPLOYMENTS.filter(
              (camera) => camera.area === area
            );
            const blocks = [
              ...new Set(cameras.map((camera) => camera.block)),
            ];

            return (
              <details key={area} open>
                <summary>{area}</summary>
                {blocks.map((block) => (
                  <details key={block} open>
                    <summary>{block === "Deployment location pending"
                      ? (selectedDevice?.location?.trim() || block)
                      : block}</summary>
                    {cameras
                      .filter((camera) => camera.block === block)
                      .map((camera) => (
                        <button
                          type="button"
                          key={camera.id}
                          aria-pressed={camera.id === selectedId}
                          onClick={() => { setActivePath(null); setSelectedId(camera.id); }}
                        >
                          {camera.label}
                        </button>
                      ))}
                  </details>
                ))}
              </details>
            );
          })}

          {!areas.length && <p>No cameras configured.</p>}
        </aside>

        <div className="camera-content">
          {selected ? (
            <>
              <p>
                Selected camera: <strong>{selected.label}</strong>
              </p>

              {view === "live" ? (
                <div className="camera-streams">
                  {([
                    ["Raw video stream", selected.rawPath],
                    ["AI-processed video stream", selected.aiPath],
                  ] as const).map(([label, path]) => (
                    <section className="camera-stream" key={label}>
                      <h2>{label}</h2>
                      {path ? (
                        activePath === path ? (
                        <>
                          <button
                            type="button"
                            className="camera-play-button"
                            onClick={() => setActivePath(null)}
                          >
                            Stop stream
                          </button>
                          <VideoPlayer key={path} cameraPath={path} />
                        </>
                      ) : (
                        <div className="camera-click-to-play">
                          <p>Click below to play this stream.</p>
                          <button
                            type="button"
                            className="camera-play-button"
                            onClick={() => setActivePath(path)}
                          >
                            Play {label}
                          </button>
                        </div>
                      )
                      ) : (
                        <p>Stream connection pending.</p>
                      )}
                    </section>
                  ))}
                </div>
              ) : (
                <section className="camera-recordings">
                  <h2>Recorded footage</h2>
                  <p>
                    Recordings are available by edge device. Select
                    the correct device using the dashboard device
                    selector.
                  </p>
                  <p>
                    Selected device:{" "}
                    <strong>{selectedDeviceId || "None"}</strong>
                  </p>
                  {selectedDeviceId ? (
                    <Link to="/sliced-footage">
                      Open device recordings
                    </Link>
                  ) : (
                    <p>Select a device to browse recordings.</p>
                  )}
                </section>
              )}
            </>
          ) : (
            <p>Select a configured camera.</p>
          )}
        </div>
      </div>

      {socket && (<section className="camera-telemetry">
        <h2>Onboard cameras — selected device</h2>
        {onboard.length ? (
          <ul>
            {onboard.map((camera) => (
              <li key={camera.name}>
                {camera.name}: {camera.status}
                {" · "}{camera.resolution ?? "--"}
                {" · "}{camera.fps ?? "--"} FPS
              </li>
            ))}
          </ul>
        ) : (
          <p>No camera telemetry available for the selected device.</p>
        )}
      </section>)}
    </section>
  );
}
