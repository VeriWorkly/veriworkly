export type AtsSeverity = "info" | "warning" | "error";

export type AtsRuleResult = {
  id: string;
  severity: AtsSeverity;
  passed: boolean;
  evidence: string;
  scoreImpact: number;
  fix: string;
};

export type AtsReport = {
  version: "ats-v1";
  readinessScore: number;
  jobMatchScore: number | null;
  parsingWarnings: string[];
  strengths: string[];
  failedChecks: AtsRuleResult[];
  prioritizedFixes: string[];
  rules: AtsRuleResult[];
};

export type AtsAiInsights = {
  explanation: string;
  missingEvidence: string[];
  keywordOpportunities: string[];
  recommendedImprovements: string[];
  priorityOrder: string[];
};

export type AtsQuotaSummary = {
  tier: "anonymous" | "free" | "subscriber";
  limit: number;
  used: number;
  remaining: number;
  resetsAt: string;
};
