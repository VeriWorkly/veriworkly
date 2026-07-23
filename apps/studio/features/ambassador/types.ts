export type AmbassadorStatus = {
  role: "USER" | "AMBASSADOR" | "ADMIN";
  ambassadorStatus: "NONE" | "PENDING" | "APPROVED" | "REJECTED" | string;
  collegeName: string | null;
  graduationYear: string | null;
};
