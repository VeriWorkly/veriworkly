import type {
  ResumeBasics,
  ResumeEducationItem,
  ResumeExperienceItem,
  ResumeProjectItem,
  ResumeSkillGroup,
} from "@/types/resume";
import {
  isEmail,
  isHttpUrl,
  isMonthDate,
  isYearDate,
  isValidPhoneValue,
  VALIDATION_MESSAGES,
} from "@/features/documents/validation/rules";

export type { ValidationErrors } from "@/features/documents/validation/rules";

import type { ValidationErrors } from "@/features/documents/validation/rules";

// Link validation is shared with the cover letter now — both editors render the same
// `LinksEditor` — so it lives with the other document-generic rules. Re-exported for the
// resume's existing callers.
export { validateLinkItem } from "@/features/documents/validation/rules";

export function validateBasics(
  basics: ResumeBasics,
): ValidationErrors<"fullName" | "role" | "headline" | "email" | "phone" | "location"> {
  const errors: ValidationErrors<
    "fullName" | "role" | "headline" | "email" | "phone" | "location"
  > = {};

  if (!basics.fullName.trim()) {
    errors.fullName = "Full name is required.";
  }

  if (!basics.headline.trim()) {
    errors.headline = "Headline is required.";
  }

  if (!basics.role.trim()) {
    errors.role = "Role is required.";
  }

  if (!basics.email.trim()) {
    errors.email = "Email is required.";
  } else if (!isEmail(basics.email)) {
    errors.email = VALIDATION_MESSAGES.email;
  }

  // Optional, matching the master profile: a phone number is not something the resume can
  // insist on when the profile it is seeded from is allowed to leave it blank.
  if (basics.phone.trim() && !isValidPhoneValue(basics.phone)) {
    errors.phone = VALIDATION_MESSAGES.phone;
  }

  if (!basics.location.trim()) {
    errors.location = "Location is required.";
  }

  return errors;
}

export function validateSummary(summary: string): ValidationErrors<"summary"> {
  const errors: ValidationErrors<"summary"> = {};

  if (!summary.trim()) {
    errors.summary = "Summary is required.";
  } else if (summary.trim().length < 30) {
    errors.summary = "Summary should be at least 30 characters.";
  }

  return errors;
}

export function validateExperience(
  item: ResumeExperienceItem,
): ValidationErrors<"role" | "company" | "location" | "startDate" | "endDate" | "summary"> {
  const errors: ValidationErrors<
    "role" | "company" | "location" | "startDate" | "endDate" | "summary"
  > = {};

  if (!item.role.trim()) {
    errors.role = "Role is required.";
  }

  if (!item.company.trim()) {
    errors.company = "Company is required.";
  }

  if (!item.location.trim()) {
    errors.location = "Location is required.";
  }

  if (!isMonthDate(item.startDate)) {
    errors.startDate = "Use YYYY-MM format.";
  }

  if (!isMonthDate(item.endDate) && !item.current) {
    errors.endDate = "Use YYYY-MM format.";
  }

  if (!item.summary.trim()) {
    errors.summary = "Summary is required.";
  }

  return errors;
}

export function validateEducation(
  item: ResumeEducationItem,
): ValidationErrors<"school" | "degree" | "field" | "startDate" | "endDate"> {
  const errors: ValidationErrors<"school" | "degree" | "field" | "startDate" | "endDate"> = {};

  if (!item.school.trim()) {
    errors.school = "School is required.";
  }

  if (!item.degree.trim()) {
    errors.degree = "Degree is required.";
  }

  if (!item.field.trim()) {
    errors.field = "Field is required.";
  }

  if (!isYearDate(item.startDate)) {
    errors.startDate = "Use YYYY format.";
  }

  if (!isYearDate(item.endDate) && !item.current) {
    errors.endDate = "Use YYYY format.";
  }

  return errors;
}

export function validateProject(
  item: ResumeProjectItem,
): ValidationErrors<"name" | "role" | "link" | "summary"> {
  const errors: ValidationErrors<"name" | "role" | "link" | "summary"> = {};

  if (!item.name.trim()) {
    errors.name = "Project name is required.";
  }

  if (!item.role.trim()) {
    errors.role = "Role is required.";
  }

  if (!isHttpUrl(item.link)) {
    errors.link = VALIDATION_MESSAGES.url;
  }

  if (!item.summary.trim()) {
    errors.summary = "Summary is required.";
  }

  return errors;
}

export function validateSkillGroup(item: ResumeSkillGroup): ValidationErrors<"name" | "keywords"> {
  const errors: ValidationErrors<"name" | "keywords"> = {};

  if (!item.name.trim()) {
    errors.name = "Group name is required.";
  }

  if (!item.keywords.length) {
    errors.keywords = "Add at least one skill.";
  }

  return errors;
}
