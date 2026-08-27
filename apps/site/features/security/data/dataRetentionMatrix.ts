import type { DataRetentionRow } from "../types";

export const DATA_RETENTION_MATRIX: DataRetentionRow[] = [
  {
    platformArea: "Unauthenticated Studio Editor",
    storageLocation: "Browser LocalStorage (Client-Only)",
    retentionPeriod: "0 days on server (Persists in browser until cleared)",
    deletionMethod: "1-click 'Clear Cache' button or browser data wipe",
    encryption: "Client-side sandboxed isolation",
  },
  {
    platformArea: "AI Resume & Bullet Optimization",
    storageLocation: "Ephemeral Gateway Memory (Stateless)",
    retentionPeriod: "0 days (Processed in memory, discarded immediately)",
    deletionMethod: "Automatic session teardown post-request",
    encryption: "TLS 1.3 in transit with zero logging",
  },
  {
    platformArea: "Synced Master Profile & Documents",
    storageLocation: "Encrypted PostgreSQL Database (Opt-in)",
    retentionPeriod: "Active account duration",
    deletionMethod: "Instant 1-click account deletion and cryptographic purge",
    encryption: "AES-256 at rest, TLS 1.3 in transit",
  },
  {
    platformArea: "Published Web Portfolios",
    storageLocation: "Global CDN Edge Network Cache",
    retentionPeriod: "While published",
    deletionMethod: "Instant toggle 'Unpublish' with edge cache invalidation",
    encryption: "Automated Edge TLS 1.3 / HTTPS",
  },
  {
    platformArea: "Security Triage Reports",
    storageLocation: "Encrypted Security Incident Queue",
    retentionPeriod: "90 days post-resolution (compliance audit log)",
    deletionMethod: "Automated purge after audit cycle",
    encryption: "GPG / PGP encrypted communication",
  },
];
