export type AtsRuleResult = {
  id: string;
  severity: "info" | "warning" | "error";
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
};

export type AtsResult = {
  report: AtsReport;
  ai: {
    explanation: string;
    missingEvidence: string[];
    keywordOpportunities: string[];
    recommendedImprovements: string[];
    priorityOrder: string[];
  } | null;
  creditsSpent: number;
  quota: {
    tier: "anonymous" | "free" | "subscriber";
    limit: number;
    used: number;
    remaining: number;
    resetsAt: string;
  };
};
