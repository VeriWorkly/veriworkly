import { siteConfig } from "@/config/site";
import type { DisclosureStepItem } from "../types";

/** Timelines must match SECURITY.md (24-48 hours); there is no Hall of Fame page, so credit is offered as a choice. */
export const DISCLOSURE_STEPS: DisclosureStepItem[] = [
  {
    label: "You report privately",
    detail: `Send the details directly to ${siteConfig.securityEmail}. Please do not open a public issue or post publicly before a fix is out.`,
  },
  {
    label: "We acknowledge within 24 to 48 hours",
    detail:
      "We confirm receipt within 24 to 48 hours. VeriWorkly is maintained by a small team, so this is a target we can hold rather than a contractual SLA.",
  },
  {
    label: "We triage and patch",
    detail:
      "We reproduce the issue, agree a severity with you, and patch it before any public disclosure. We will tell you honestly if a fix is going to take time.",
  },
  {
    label: "We release together, with credit",
    detail:
      "Once the fix is live we coordinate disclosure with you, and credit you by name in the release notes if you would like to be named.",
  },
];

/** Safe harbour: states plainly that authorised research is not an offence under computer-misuse law. */
export const DISCLOSURE_SAFE_HARBOUR = {
  title: "Safe harbour for good-faith research",
  body: "If you make a good-faith effort to follow this policy while researching a vulnerability, we will treat your testing as authorised. We will not pursue or support legal action against you, and if a third party brings action over research that followed this policy, we will make it known that your testing was authorised. Stay within scope, work only with your own accounts and data, do not degrade the service for others, do not access or retain anyone else's personal data, and give us a reasonable chance to fix the issue before disclosing it. If you are unsure whether something is in scope, ask us first — we would rather answer the question than have you guess.",
} as const;
