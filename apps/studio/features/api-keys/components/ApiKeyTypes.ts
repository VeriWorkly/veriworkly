export interface ApiKeyListRecord {
  id: string;
  name: string;
  keyPrefix: string;
  isActive: boolean;
  createdAt: string;
  lastUsed: string | null;
}

export type ApiKeyRecord = ApiKeyListRecord;

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

export interface OffsetPaginationPayload<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
  pagination: {
    mode: "offset";
    nextOffset: number | null;
    nextCursor: string | null;
  };
}
