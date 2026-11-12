export const ROLE_LABELS = {
  COMMISSIONER: "Commissioner of Police",
  JOINT_COMMISSIONER: "Joint / Additional Commissioner",
  DCP: "Deputy Commissioner of Police",
  ACP: "Assistant Commissioner of Police",
  PI: "Police Inspector",
  HEAD_CONSTABLE: "Head Constable",
  CONSTABLE: "Police Constable",
} as const;

export type PoliceRole = keyof typeof ROLE_LABELS;
