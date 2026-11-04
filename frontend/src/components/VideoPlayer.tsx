import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

import {
  Box,
  Typography,
  CircularProgress,
  Alert,
} from "@mui/material";

const MEDIAMTX_URL =
  import.meta.env.VITE_MEDIAMTX_URL ||
  "http://localhost:8888";

interface VideoPlayerProps {
  cameraPath: string;
}

export default function VideoPlayer({
  cameraPath,
}: VideoPlayerProps) {
  const videoRef =
    useRef<HTMLVideoElement | null>(null);

  const [status, setStatus] = useState<
    "loading" | "playing" | "error"
  >("loading");

  const [errorMsg, setErrorMsg] =
    useState("");

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    const streamUrl = `${MEDIAMTX_URL.replace(
      /\/$/,
      ""
    )}/${cameraPath}/index.m3u8`;

    setStatus("loading");

    let hls: Hls | null = null;

    if (Hls.isSupported()) {
      hls = new Hls({
        lowLatencyMode: true,
        backBufferLength: 10,
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(
        Hls.Events.MANIFEST_PARSED,
        () => {
          video.play().catch(() => {});
          setStatus("playing");
        }
      );

      hls.on(
        Hls.Events.ERROR,
        (_event, data) => {
          if (data.fatal) {
            setStatus("error");

            setErrorMsg(
              "Stream unavailable — check the camera is online and the MediaMTX path name is correct."
            );
          }
        }
      );
    } else if (
      video.canPlayType(
        "application/vnd.apple.mpegurl"
      )
    ) {
      video.src = streamUrl;

      const onLoadedMetadata = () => {
        video.play().catch(() => {});
        setStatus("playing");
      };

      const onError = () => {
        setStatus("error");

        setErrorMsg(
          "Stream unavailable — check the camera is online and the MediaMTX path name is correct."
        );
      };

      video.addEventListener(
        "loadedmetadata",
        onLoadedMetadata
      );

      video.addEventListener(
        "error",
        onError
      );

      return () => {
        video.removeEventListener(
          "loadedmetadata",
          onLoadedMetadata
        );

        video.removeEventListener(
          "error",
          onError
        );
      };
    } else {
      setStatus("error");

      setErrorMsg(
        "This browser doesn't support HLS playback."
      );
    }

    return () => {
      hls?.destroy();
    };
  }, [cameraPath]);

  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        aspectRatio: "16 / 9",
        backgroundColor: "#000",
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      <video
        ref={videoRef}
        muted
        playsInline
        controls
        style={{
          width: "100%",
          height: "100%",
          maxWidth: "100%",
          display: "block",
          objectFit: "contain",
        }}
      />

      {status === "loading" && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
            p: 2,
          }}
        >
          <CircularProgress size={28} />

          <Typography
            variant="caption"
            color="text.secondary"
          >
            Connecting to camera…
          </Typography>
        </Box>
      )}

      {status === "error" && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            p: 2,
          }}
        >
          <Alert
            severity="warning"
            sx={{
              width: "100%",
              maxWidth: 360,
            }}
          >
            {errorMsg}
          </Alert>
        </Box>
      )}
    </Box>
  );
}
