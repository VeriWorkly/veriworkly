import type { LucideIcon } from "lucide-react";

export interface HeroPillar {
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface FeatureComparisonRow {
  feature: string;
  veriworkly: string;
  competitor: string;
}

export interface ExportFormatItem {
  ext: string;
  name: string;
  desc: string;
  badge: string;
}
