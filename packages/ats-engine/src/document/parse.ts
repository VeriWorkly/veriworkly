import { educationLevel } from "../parser/education.js";
import { findPhone } from "../parser/phone.js";
import { parseDocumentDate } from "../parser/dates.js";
import { finalizeParsed } from "../parser/record.js";
import type { AtsEnginePolicy } from "../policy/schema.js";
import type { AtsParsedEducation, AtsParsedResume, AtsParsedRole } from "../types.js";
import type { AtsResumeDocument } from "./types.js";

const dateValue = (date: { year: number; month: number | null } | null, fallbackMonth: number) =>
  date ? date.year * 12 + (date.month ?? fallbackMonth) : null;

/**
 * The recovered record for a structured document, read from its fields rather than parsed.
 *
 * Nothing here is inferred: a role's title is the title field, its dates are the date fields.
 * Only the degree level is classified, from the credential text, because the document names a
 * credential ("MSc Data Science") rather than a level.
 *
 * Every experience-kind section contributes roles. Sections an ATS files separately —
 * volunteering, certifications — belong in `other` and never count toward tenure.
 */
export function parseResumeDocument(
  doc: AtsResumeDocument,
  policy: AtsEnginePolicy,
  now: Date,
): AtsParsedResume {
  const rp = policy.resumeParse;
  const roles: AtsParsedRole[] = [];
  const education: AtsParsedEducation[] = [];
  const skills: string[] = [];

  for (const section of doc.sections) {
    if (section.kind === "experience") {
      for (const item of section.items) {
        const title = item.title.trim();
        const employer = item.employer.trim();
        if (!title && !employer) continue;
        const current = Boolean(item.current);
        roles.push({
          title,
          employer,
          start: parseDocumentDate(item.start, rp, now),
          end: current ? null : parseDocumentDate(item.end, rp, now),
          current,
        });
      }
    } else if (section.kind === "education") {
      for (const item of section.items) {
        const school = item.school.trim();
        const credential = [item.credential?.trim(), item.field?.trim()]
          .filter(Boolean)
          .join(" in ");
        if (!school && !credential) continue;
        education.push({
          school,
          credential,
          ...educationLevel(credential, policy),
          end: item.current ? null : parseDocumentDate(item.end, rp, now),
        });
      }
    } else if (section.kind === "skills") {
      for (const group of section.items) {
        const keywords = group.keywords.map((keyword) => keyword.trim()).filter(Boolean);
        // A group with no keywords is itself the skill ("Kubernetes" with no sub-list).
        if (keywords.length) skills.push(...keywords);
        else if (group.name?.trim()) skills.push(group.name.trim());
      }
    }
  }

  for (const role of roles) {
    const start = dateValue(role.start, 1);
    const end = dateValue(role.end, 12);
    if (start !== null && end !== null && start > end) {
      role.start = null;
      role.end = null;
    }
  }

  const { basics } = doc;
  return finalizeParsed(
    {
      name: basics.name.trim(),
      email: basics.email?.trim() ?? "",
      // Held to the check a printed number is: a field reading "0000000000" is not a phone an
      // ATS would file, and the structured path must not credit what the text path would not.
      phone: basics.phone ? findPhone(basics.phone, policy, now) : "",
      links: (basics.links ?? []).map((link) => link.trim()).filter(Boolean),
      roles,
      education,
      skills: skills.filter((skill) => skill.length <= 60),
    },
    () => "structured",
    now,
  );
}
