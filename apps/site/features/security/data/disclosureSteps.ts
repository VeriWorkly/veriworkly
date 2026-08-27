import { FileWarning, Clock3, Wrench, ShieldAlert } from "lucide-react";
import { siteConfig } from "@/config/site";
import type { DisclosureStepItem } from "../types";

export const DISCLOSURE_STEPS: DisclosureStepItem[] = [
  {
    step: "01",
    label: "1. You Report Privately",
    detail: `Send flaw details directly to ${siteConfig.email}. Please do not open public issues or social media threads before a fix is released.`,
    icon: FileWarning,
  },
  {
    step: "02",
    label: "2. We Acknowledge (24h SLA)",
    detail:
      "We confirm receipt within 24 hours and assign a designated security engineer to evaluate the vulnerability.",
    icon: Clock3,
  },
  {
    step: "03",
    label: "3. Rapid Patch & Verification",
    detail:
      "Validated vulnerabilities are prioritized, patched, and pushed to production before any public disclosure occurs.",
    icon: Wrench,
  },
  {
    step: "04",
    label: "4. Coordinated Release & Credit",
    detail:
      "Once deployed and verified, we coordinate public disclosure and gladly add you to our Security Hall of Fame.",
    icon: ShieldAlert,
  },
];
