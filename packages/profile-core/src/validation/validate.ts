import { isValidPhoneValue } from "../common/phone.js";
import { isEmail, isMonthDate, isYearDate, isValidAbsoluteUrl } from "../common/primitives.js";
import type { MasterProfileData } from "../schema/types.js";

function isFiniteNumber(value: number): boolean {
  return Number.isFinite(value) && !Number.isNaN(value);
}

/**
 * The "can this be saved" check, as an issue list rather than a thrown error.
 *
 * Distinct from `masterProfileSchema` on purpose: the schema decides what can be *stored*
 * and is deliberately permissive, because a half-filled profile must survive a reload. This
 * decides what is ready to be *published upstream*, and is where a blank required field is
 * an error rather than a normal intermediate state.
 */
export interface MasterProfileValidationResult {
  ok: boolean;
  issues: string[];
}

/**
 * The "can this be saved" check, as an issue list and boolean status rather than a thrown error.
 */
export function validateMasterProfileForSave(
  profile: MasterProfileData,
): MasterProfileValidationResult {
  const issues: string[] = [];

  if (!isEmail(profile.basics.email.trim())) {
    issues.push("Basics email must be a valid email address.");
  }

  // Guarded like the reference-phone check below: an empty phone is "not provided",
  // not "invalid" — only reject it once the user has actually typed something.
  if (profile.basics.phone.trim() && !isValidPhoneValue(profile.basics.phone.trim())) {
    issues.push("Basics phone must include a country code (e.g. +44 20 7946 0958).");
  }

  for (const link of profile.links.items) {
    if (!isValidAbsoluteUrl(link.url.trim())) {
      issues.push(`Link "${link.label || link.type}" must be a valid URL.`);
    }
  }

  for (const project of profile.projects) {
    if (project.link.trim() && !isValidAbsoluteUrl(project.link.trim())) {
      issues.push(`Project "${project.name || "Untitled"}" has an invalid link URL.`);
    }
  }

  for (const experience of profile.experience) {
    if (
      !isMonthDate(experience.startDate) ||
      (!experience.current && !isMonthDate(experience.endDate))
    ) {
      issues.push(`Experience "${experience.role || "Untitled"}" must use YYYY-MM dates.`);
    }
  }

  for (const education of profile.education) {
    if (
      !isYearDate(education.startDate) ||
      (!education.current && !isYearDate(education.endDate))
    ) {
      issues.push(`Education "${education.degree || "Untitled"}" must use year-only dates.`);
    }
  }

  for (const award of profile.awards) {
    if (award.website?.trim() && !isValidAbsoluteUrl(award.website.trim())) {
      issues.push(`Award "${award.title || "Untitled"}" has an invalid website URL.`);
    }

    if (!isMonthDate(award.date)) {
      issues.push(`Award "${award.title || "Untitled"}" must use a YYYY-MM date.`);
    }
  }

  for (const certificate of profile.certificates) {
    if (certificate.website?.trim() && !isValidAbsoluteUrl(certificate.website.trim())) {
      issues.push(`Certificate "${certificate.title || "Untitled"}" has an invalid website URL.`);
    }

    if (!isMonthDate(certificate.date)) {
      issues.push(`Certificate "${certificate.title || "Untitled"}" must use a YYYY-MM date.`);
    }
  }

  for (const publication of profile.publications) {
    if (publication.website?.trim() && !isValidAbsoluteUrl(publication.website.trim())) {
      issues.push(`Publication "${publication.title || "Untitled"}" has an invalid website URL.`);
    }

    if (!isMonthDate(publication.date)) {
      issues.push(`Publication "${publication.title || "Untitled"}" must use a YYYY-MM date.`);
    }
  }

  for (const volunteer of profile.volunteer) {
    if (
      !isMonthDate(volunteer.startDate) ||
      (!volunteer.current && !isMonthDate(volunteer.endDate))
    ) {
      issues.push(`Volunteer "${volunteer.organization || "Untitled"}" must use YYYY-MM dates.`);
    }
  }

  for (const reference of profile.references) {
    if (reference.email?.trim() && !isEmail(reference.email.trim())) {
      issues.push(`Reference "${reference.name || "Untitled"}" has an invalid email address.`);
    }

    // Phone is optional on a reference, but when provided it must be valid.
    if (reference.phone?.trim() && !isValidPhoneValue(reference.phone.trim())) {
      issues.push(
        `Reference "${reference.name || "Untitled"}" phone must include a country code (e.g. +44 20 7946 0958).`,
      );
    }
  }

  for (const custom of profile.customSections) {
    for (const item of custom.items) {
      if (item.link.trim() && !isValidAbsoluteUrl(item.link.trim())) {
        issues.push(
          `Item "${item.name || "Untitled"}" in custom section "${custom.title || "Untitled"}" has an invalid URL.`,
        );
      }
    }
  }

  const { customization } = profile;
  if (
    !isFiniteNumber(customization.sectionSpacing) ||
    customization.sectionSpacing < 0 ||
    customization.sectionSpacing > 120
  ) {
    issues.push("Section Spacing must be between 0 and 120.");
  }
  if (
    !isFiniteNumber(customization.pagePadding) ||
    customization.pagePadding < 0 ||
    customization.pagePadding > 120
  ) {
    issues.push("Page Padding must be between 0 and 120.");
  }
  if (
    !isFiniteNumber(customization.bodyLineHeight) ||
    customization.bodyLineHeight < 1 ||
    customization.bodyLineHeight > 3
  ) {
    issues.push("Body Line Height must be between 1 and 3.");
  }
  if (
    !isFiniteNumber(customization.headingLineHeight) ||
    customization.headingLineHeight < 1 ||
    customization.headingLineHeight > 3
  ) {
    issues.push("Heading Line Height must be between 1 and 3.");
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}
