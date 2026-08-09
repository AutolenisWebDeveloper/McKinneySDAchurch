import type { TransferStatus } from "@prisma/client";

/** Public intake -> clerk review -> handed to eAdventist (system of record) -> completed. */
const ALLOWED: Record<TransferStatus, TransferStatus[]> = {
  SUBMITTED: ["IN_REVIEW", "DECLINED", "WITHDRAWN"],
  IN_REVIEW: ["HANDED_TO_EADVENTIST", "DECLINED", "WITHDRAWN"],
  HANDED_TO_EADVENTIST: ["COMPLETED", "WITHDRAWN"],
  COMPLETED: [],
  DECLINED: [],
  WITHDRAWN: [],
};

export function canTransferTransition(from: TransferStatus, to: TransferStatus): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}

export const TRANSFER_PIPELINE: TransferStatus[] = ["SUBMITTED", "IN_REVIEW", "HANDED_TO_EADVENTIST", "COMPLETED"];
