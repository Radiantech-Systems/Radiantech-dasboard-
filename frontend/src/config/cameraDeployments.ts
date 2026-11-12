export interface CameraDeployment {
  id: string;
  label: string;
  area: string;
  block: string;
  rawPath?: string;
  aiPath?: string;
}

// Update area/block when actual deployment locations are available.
export const CAMERA_DEPLOYMENTS: CameraDeployment[] = [
  {
    id: "cam-1",
    label: "Cam 1",
    area: "Configured cameras",
    block: "Deployment location pending",
    rawPath: "jetson1_raw",
    aiPath: "jetson1_ai",
  },
  {
    id: "cam-2",
    label: "Cam 2",
    area: "Configured cameras",
    block: "Deployment location pending",
    rawPath: "jetson2_raw",
    aiPath: "jetson2_ai",
  },
];
