import { FileWarning, Clock3, Wrench, ShieldAlert } from "lucide-react";
import { siteConfig } from "@/config/site";
import type { DisclosureStepItem } from "../types";

/**
 * Timelines here are what one person can actually hit on a bad week, and they match
 * SECURITY.md (24-48 hours) rather than contradicting it with a "24h SLA" badge.
 *
 * Removed: the "Security Hall of Fame" credit promise. No acknowledgements page
 * exists, and security.txt pointed its Acknowledgments field at it. Credit is now
 * offered as a genuine choice rather than a named programme that does not exist.
 */
export const DISCLOSURE_STEPS: DisclosureStepItem[] = [
  {
    step: "01",
    label: "1. You Report Privately",
    detail: `Send the details directly to ${siteConfig.email}. Please do not open a public issue or post publicly before a fix is out.`,
    icon: FileWarning,
  },
  {
    step: "02",
    label: "2. We Acknowledge (24-48h)",
    detail:
      "We confirm receipt within 24 to 48 hours. VeriWorkly is maintained by a small team, so this is a target we can hold rather than a contractual SLA.",
    icon: Clock3,
  },
  {
    step: "03",
    label: "3. Triage & Patch",
    detail:
      "We reproduce the issue, agree a severity with you, and patch it before any public disclosure. We will tell you honestly if a fix is going to take time.",
    icon: Wrench,
  },
  {
    step: "04",
    label: "4. Coordinated Release & Credit",
    detail:
      "Once the fix is live we coordinate disclosure with you, and credit you by name in the release notes if you would like to be named.",
    icon: ShieldAlert,
  },
];

/**
 * Safe harbour. Without this, a researcher testing us has no assurance and real
 * exposure under computer-misuse law, and we have no stated boundary between
 * authorised research and an offence. Authorisation is the hinge the whole offence
 * turns on, so it is stated plainly.
 */
export const DISCLOSURE_SAFE_HARBOUR = {
  title: "Safe harbour for good-faith research",
  body: "If you make a good-faith effort to follow this policy while researching a vulnerability, we will treat your testing as authorised. We will not pursue or support legal action against you, and if a third party brings action over research that followed this policy, we will make it known that your testing was authorised. Stay within scope, work only with your own accounts and data, do not degrade the service for others, do not access or retain anyone else's personal data, and give us a reasonable chance to fix the issue before disclosing it. If you are unsure whether something is in scope, ask us first — we would rather answer the question than have you guess.",
} as const;
