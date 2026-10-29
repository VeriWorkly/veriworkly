export type AmbassadorApplicationSnapshot = {
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
  role: "USER" | "AMBASSADOR" | "ADMIN";
  ambassadorStatus: "NONE" | "PENDING" | "APPROVED" | "REJECTED" | string;
  collegeName: string | null;
  graduationYear: string | null;
  application: AmbassadorApplicationSnapshot | null;
};

export type AmbassadorApplicationPayload = {
  collegeName: string;
  graduationYear: string;
  whyJoin: string;
  superpower: string;
  funFact: string;
  vibeCheck?: string;
  socialHandle?: string;
};

export type ApplyViewer = {
  isAuthenticated: boolean;
  /** The signed-in account's email, used to keep one viewer's saved draft from another; null for a guest. */
  viewerKey: string | null;
  name: string | null;
  draft: Partial<AmbassadorApplicationPayload> | null;
  reviewNote: string | null;
};
