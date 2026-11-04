// Cameras shown on the "Live CCTV Streams" table and reachable at
// /live/<path>.
//
// "mediamtx" — camera/RTSP stream pulled by MediaMTX and re-served
// as HLS to the Dashboard.

export interface CctvStream {
  label: string;
  path: string;
  source: "mjpeg" | "mediamtx";
  streamUrl?: string;
}

export const CCTV_STREAMS: CctvStream[] = [
  {
    label: "Cam 1",
    path: "jetson1_raw",
    source: "mediamtx",
  },
  {
    label: "Cam 1 Processed AI Stream",
    path: "jetson1_ai",
    source: "mediamtx",
  },
  {
    label: "Cam 2",
    path: "jetson2_raw",
    source: "mediamtx",
  },
  {
    label: "Cam 2 Processed AI Stream",
    path: "jetson2_ai",
    source: "mediamtx",
  },
];
