import { ROLE_LABELS } from "./policeRoles";
import type { PoliceRole } from "./policeRoles";

export function displayRole(identity: {
  role?: string;
  police_role?: string | null;
}): string {
  const rank = identity.police_role;

  if (
    rank &&
    Object.prototype.hasOwnProperty.call(ROLE_LABELS, rank)
  ) {
    return ROLE_LABELS[rank as PoliceRole];
  }

  return identity.role ?? "Not assigned";
}
