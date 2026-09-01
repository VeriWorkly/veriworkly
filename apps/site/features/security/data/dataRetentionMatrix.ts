import type { DataRetentionRow } from "../types";

export const DATA_RETENTION_MATRIX: DataRetentionRow[] = [
  {
    platformArea: "Unauthenticated Studio Editor",
    storageLocation: "Browser LocalStorage (Client-Only)",
    retentionPeriod: "0 days on server (Persists in browser until cleared)",
    deletionMethod: "1-click 'Clear Cache' button or browser data wipe",
    encryption: "Held in your browser; not encrypted by us",
  },
  {
    platformArea: "AI Resume & Bullet Optimization",
    storageLocation: "In memory, plus a third-party model provider",
    retentionPeriod: "0 days with us; provider terms apply to the request itself",
    deletionMethod: "Automatic session teardown post-request",
    encryption: "HTTPS in transit; request text not retained",
  },
  {
    platformArea: "Synced Master Profile & Documents",
    storageLocation: "PostgreSQL database (opt-in sync)",
    retentionPeriod: "Active account duration",
    deletionMethod: "1-click account deletion; records removed from our database",
    encryption: "HTTPS in transit; at-rest encryption per our providers",
  },
  {
    platformArea: "Published Web Portfolios",
    storageLocation: "Published page, plus our own cache",
    retentionPeriod: "While published",
    deletionMethod: "'Unpublish' takes it private, clears our cache, and triggers regeneration",
    encryption: "Automated edge HTTPS",
  },
  {
    platformArea: "Security Triage Reports",
    storageLocation: "Security inbox",
    retentionPeriod: "90 days post-resolution (compliance audit log)",
    deletionMethod: "Automated purge after audit cycle",
    encryption: "Email over TLS (we do not currently publish a PGP key)",
  },
];
