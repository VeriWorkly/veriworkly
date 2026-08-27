import type { LucideIcon } from "lucide-react";

export interface WorkflowStepItem {
  step: string;
  title: string;
  subtitle: string;
  description: string;
  tags: string[];
}

export interface PipelineNodeItem {
  step: string;
  label: string;
  desc: string;
  icon: LucideIcon;
}
