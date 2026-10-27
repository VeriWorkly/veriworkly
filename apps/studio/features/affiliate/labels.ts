/** The server's affiliate enums as a person reads them. An unknown value is shown as sent. */
const COMMISSION_STATUS: Record<string, string> = {
  PENDING: "Pending review",
  AVAILABLE: "Available",
  REVERSED: "Reversed",
  PAID: "Paid out",
};

const WITHDRAWAL_STATUS: Record<string, string> = {
  REQUESTED: "Requested",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  PAID: "Paid",
};

const REFERRAL_STATUS: Record<string, string> = {
  SIGNED_UP: "Signed up",
  CONVERTED: "Purchased",
  REJECTED: "Not counted",
};

export const commissionStatusLabel = (status: string) => COMMISSION_STATUS[status] ?? status;
export const withdrawalStatusLabel = (status: string) => WITHDRAWAL_STATUS[status] ?? status;
export const referralStatusLabel = (status: string) => REFERRAL_STATUS[status] ?? status;
