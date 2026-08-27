import type { LucideIcon } from "lucide-react";

export interface SecurityCommitment {
  icon: LucideIcon;
  title: string;
  desc: string;
}

export interface EncryptionBoundary {
  number: string;
  title: string;
  description: string;
  specs: string[];
}

export interface OAuthScopeItem {
  provider: string;
  scope: string;
  accessType: string;
  purpose: string;
  restrictions: string;
}

export interface DataRetentionRow {
  platformArea: string;
  storageLocation: string;
  retentionPeriod: string;
  deletionMethod: string;
  encryption: string;
}

export interface DisclosureStepItem {
  step: string;
  label: string;
  detail: string;
  icon: LucideIcon;
}

export interface ScopeClassification {
  category: string;
  items: string[];
}
