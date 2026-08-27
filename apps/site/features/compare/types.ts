export type MatrixValue = boolean | string;

export interface FeatureRowItem {
  key: string;
  label: string;
  category: "access" | "builder" | "ats" | "integrations";
  description?: string;
}

export interface CompetitorFeatureMatrix {
  loginRequired: MatrixValue;
  localFirst: MatrixValue;
  openSource: MatrixValue;
  freePlan: MatrixValue;
  freeExport: MatrixValue;
  watermarkFree: MatrixValue;
  atsChecker: MatrixValue;
  coverLetterBuilder: MatrixValue;
  portfolioBuilder: MatrixValue;
  multiFormatExport: MatrixValue;
  linkedinImport: MatrixValue;
  githubImport: MatrixValue;
}

export interface CompetitorFaq {
  question: string;
  answer: string;
}

export interface DeepDivePillar {
  title: string;
  competitorApproach: string;
  veriworklyApproach: string;
  takeaway: string;
}

export interface Competitor {
  id: string;
  name: string;
  shortName: string;
  initials: string;
  color: string;
  website: string;
  positioning: string;
  verdict: string;
  bestForCompetitor: string;
  bestForVeriworkly: string;
  pricingSummary: string;
  pricingModel: string;
  paidPlans: string[];
  standoutFeature: string;
  knownLimitation: string;
  whySwitch: string;
  deepDive: DeepDivePillar[];
  matrix: CompetitorFeatureMatrix;
  faqs: CompetitorFaq[];
}
