export type CreditWallet = {
  balance: number;
  lifetimeCredited: number;
  lifetimeDebited: number;
  updatedAt: string;
  nextExpiryAt: string | null;
  nextExpiryCredits: number;
};

export type CreditTransaction = {
  id: string;
  type: "GRANT" | "DEBIT" | "REFUND" | "ADJUSTMENT" | "EXPIRATION";
  amount: number;
  balanceAfter: number;
  action: string | null;
  documentId: string | null;
  reason: string | null;
  createdAt: string;
};
