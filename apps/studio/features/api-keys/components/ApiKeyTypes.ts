export interface ApiKeyRecord {
  id: string;
  name: string;
  keyPrefix: string;
  isActive: boolean;
  createdAt: string;
  lastUsed: string | null;
  /** Sent by `GET /api-keys` (V-195), so a revoked or expired key is never read as admin-disabled. */
  expiresAt: string | null;
  revokedAt: string | null;
}

export interface ApiKeyDetailRecord {
  id: string;
  keyPrefix: string;
  keySuffix: string;
  name: string;
  isActive: boolean;
  rateLimit: number;
  scopes: string[];
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  lastUsed: string | null;
}

export interface GeneratedApiKeyRecord extends ApiKeyDetailRecord {
  key: string;
}
