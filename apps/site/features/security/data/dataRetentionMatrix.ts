import type { DataRetentionRow } from "../types";

export const DATA_RETENTION_MATRIX: DataRetentionRow[] = [
  {
    platformArea: "Studio, without an account",
    storageLocation: "Your browser's local storage",
    retentionPeriod: "Never on our servers; stays in your browser until cleared",
    deletionMethod: "The Clear cache button, or clearing your browser data",
    encryption: "Held in your browser; not encrypted by us",
  },
  {
    platformArea: "AI resume and bullet rewrites",
    storageLocation: "In memory, plus a third-party model provider",
    retentionPeriod: "Not kept by us; the provider's terms apply to the request",
    deletionMethod: "Discarded when the request ends",
    encryption: "HTTPS in transit; request text not retained",
  },
  {
    platformArea: "Synced Master Profile and documents",
    storageLocation: "PostgreSQL database (opt-in sync)",
    retentionPeriod: "Active account duration",
    deletionMethod: "Delete your account; the records leave our database",
    encryption: "HTTPS in transit; at-rest encryption per our providers",
  },
  {
    platformArea: "Published web portfolios",
    storageLocation: "Published page, plus our own cache",
    retentionPeriod: "While published",
    deletionMethod: "Unpublish takes it private, clears our cache and rebuilds the page",
    encryption: "Automated edge HTTPS",
  },
  {
    platformArea: "Security reports",
    storageLocation: "Security inbox",
    retentionPeriod: "90 days after the fix (kept as an audit log)",
    deletionMethod: "Deleted by hand after that",
    encryption: "Email over TLS (we do not currently publish a PGP key)",
  },
];
