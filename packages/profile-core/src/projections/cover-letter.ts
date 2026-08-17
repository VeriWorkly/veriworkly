import type { MasterProfileData, MasterProfileLinkType } from "../schema/types.js";

import {
  DEFAULT_COVER_LETTER_APPEARANCE,
  type CoverLetterContent,
} from "./cover-letter-content.js";

export interface ProjectToCoverLetterOptions {
  jobTitle?: string;
  companyName?: string;
  recipientName?: string;
  /** Injected so tests are deterministic; defaults to now. */
  now?: string;
}

/**
 * The first link of `type` that actually has a url.
 *
 * "First of this type" is not enough on its own: a user who added a portfolio row and left
 * the url blank would otherwise shadow a filled-in custom link and get an empty website.
 */
function findLinkUrl(master: MasterProfileData, type: MasterProfileLinkType): string {
  return master.links.items.find((item) => item.type === type && item.url.trim())?.url ?? "";
}

/** Matches the format `createDefaultCoverLetter` writes, so both letters read alike. */
function formatLetterDate(now: string | undefined): string {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(now ? new Date(now) : new Date());
}

/**
 * Turns a master profile into a new cover letter.
 *
 * Only the identity block is filled. Everything that belongs to a *specific application* —
 * recipient, company, subject, greeting, opening, body, highlights, closing, postscript —
 * is left empty unless the caller names the job, because a plausible-looking letter the
 * user did not write is worse than a blank one they know to fill in. Every one of the five
 * templates reads the same six sender fields, so this fixes all five at once; they used to
 * render the hardcoded "Veriworkly User".
 *
 * `appearance` comes from this package's defaults and NOT from `master.customization`. The
 * master customization is resume page geometry — section spacing, page padding, heading
 * line height — and means nothing for a letter.
 *
 * Pure, deterministic given `now`, and deep-cloned throughout: the returned letter shares no
 * reference with `master`.
 */
export function projectToCoverLetter(
  master: MasterProfileData,
  options: ProjectToCoverLetterOptions = {},
): CoverLetterContent {
  const { jobTitle = "", companyName = "", recipientName = "" } = options;

  // Both are needed before a subject line can say anything true.
  const hasTarget = Boolean(jobTitle && companyName);

  return {
    senderName: master.basics.fullName,
    // `role` is the job title the user holds; `headline` is the one-liner. Either reads as a
    // title under a name, but an empty role should not leave the line blank.
    senderTitle: master.basics.role || master.basics.headline,
    senderEmail: master.basics.email,
    senderPhone: master.basics.phone,
    senderLocation: master.basics.location,
    senderWebsite: findLinkUrl(master, "portfolio") || findLinkUrl(master, "custom"),

    links: structuredClone(master.links),

    date: formatLetterDate(options.now),

    recipientName,
    recipientTitle: "",

    companyName,
    companyLocation: "",

    jobTitle,
    subject: hasTarget ? `Application for ${jobTitle} at ${companyName}` : "",

    greeting: hasTarget
      ? recipientName
        ? `Dear ${recipientName},`
        : `Dear ${companyName} Hiring Team,`
      : "",

    opening: "",
    body: "",
    highlights: "",

    closing: hasTarget ? "Sincerely," : "",
    signature: master.basics.fullName,
    postscript: "",

    appearance: structuredClone(DEFAULT_COVER_LETTER_APPEARANCE),
  };
}
