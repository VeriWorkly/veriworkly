export type CreditWallet = {
  /** Can still hold expired credits until the next sweep; never shown as spendable. */
  balance: number;
  /** Held by actions still in progress. */
  reserved: number;
  /** What an AI action can spend right now. */
  available: number;
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
  /** Server-minted for grants, with a prefix naming the source (`annual-credit:`, `admin-credit:`). */
  requestId?: string | null;
  documentId: string | null;
  reason: string | null;
  createdAt: string;
};
