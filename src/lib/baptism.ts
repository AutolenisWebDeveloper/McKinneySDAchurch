import type { BaptismStatus } from "@prisma/client";

/** Baptism preparation pipeline. WITHDRAWN is reachable from any active state. */
const ALLOWED: Record<BaptismStatus, BaptismStatus[]> = {
  REQUESTED: ["IN_CLASS", "WITHDRAWN"],
  IN_CLASS: ["SCHEDULED", "WITHDRAWN"],
  SCHEDULED: ["COMPLETED", "WITHDRAWN"],
  COMPLETED: [],
  WITHDRAWN: [],
};

export function canBaptismTransition(from: BaptismStatus, to: BaptismStatus): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}

export const BAPTISM_STAGES: BaptismStatus[] = ["REQUESTED", "IN_CLASS", "SCHEDULED", "COMPLETED"];
