import type { Role } from "@/features/admin/types/admin-types";

type AmbassadorApplicationSnapshot = {
  collegeName: string;
  graduationYear: string;
  whyJoin: string;
  superpower: string;
  funFact: string;
  vibeCheck: string | null;
  socialHandle: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | string;
  reviewNote: string | null;
  reviewedAt: string | null;
  submittedAt: string;
  updatedAt: string;
};

export type AmbassadorStatus = {
  name: string | null;
  email: string | null;
  role: Role;
  ambassadorStatus: "NONE" | "PENDING" | "APPROVED" | "REJECTED" | string;
  collegeName: string | null;
  graduationYear: string | null;
  application: AmbassadorApplicationSnapshot | null;
};

/**
 * Approval is recorded on `ambassadorStatus`; the role moves to AMBASSADOR only for a plain user,
 * so an approved admin keeps ADMIN and must still read as an ambassador.
 */
export function isApprovedAmbassador(status: AmbassadorStatus | null) {
  return status?.role === "AMBASSADOR" || status?.ambassadorStatus === "APPROVED";
}
