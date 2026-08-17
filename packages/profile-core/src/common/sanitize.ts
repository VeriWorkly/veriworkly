import type { MasterProfileData } from "../schema/types.js";

import { normalizePhoneValue } from "./phone.js";
import { normalizeAbsoluteUrl } from "./primitives.js";

/**
 * Tidies a profile immediately before it is persisted: trims, folds URLs to absolute form,
 * and folds phone numbers to E.164.
 *
 * The phone fields used to run `.replace(/\D/g, "").slice(0, 10)`, which deleted the "+"
 * from every international number on save. That single line is the reason this function is
 * worth having a test around.
 *
 * It also used to rebuild eight "compatibility" custom sections, mirroring each typed array
 * into the flat `{name, issuer, date, link, ...}` item shape because resume templates read
 * their optional sections from `customSections`. That mirror was lossy in one direction and
 * absent in the other, so it was deleted: templates now read the typed arrays, and
 * `customSections` holds only sections the user actually invented. This is the change that
 * makes the master -> resume hand-off lossless.
 */
export function sanitizeMasterProfileForSave(profile: MasterProfileData): MasterProfileData {
  const sanitized = {
    ...profile,
    basics: {
      ...profile.basics,
      fullName: profile.basics.fullName.trim(),
      role: profile.basics.role.trim(),
      headline: profile.basics.headline.trim(),
      email: profile.basics.email.trim().toLowerCase(),
      phone: normalizePhoneValue(profile.basics.phone),
      location: profile.basics.location.trim(),
    },
    links: {
      ...profile.links,
      items: profile.links.items.map((item) => ({
        ...item,
        url: normalizeAbsoluteUrl(item.url),
      })),
    },
    projects: profile.projects.map((item) => ({
      ...item,
      name: item.name.trim(),
      role: item.role.trim(),
      link: normalizeAbsoluteUrl(item.link),
      linkLabel: item.linkLabel?.trim() || "Link",
      showLinkAsText: item.showLinkAsText ?? true,
      summary: item.summary.trim(),
      skills: item.skills ?? [],
    })),
    experience: profile.experience.map((item) => ({
      ...item,
      startDate: item.startDate.trim(),
      endDate: item.current ? "" : item.endDate.trim(),
    })),
    education: profile.education.map((item) => ({
      ...item,
      startDate: item.startDate.replace(/\D/g, "").slice(0, 4),
      endDate: item.current ? "" : item.endDate.replace(/\D/g, "").slice(0, 4),
    })),
    awards: profile.awards.map((item) => ({
      ...item,
      title: item.title.trim(),
      awarder: item.awarder.trim(),
      website: normalizeAbsoluteUrl(item.website ?? ""),
      description: item.description.trim(),
    })),
    certificates: profile.certificates.map((item) => ({
      ...item,
      title: item.title.trim(),
      issuer: item.issuer.trim(),
      website: normalizeAbsoluteUrl(item.website ?? ""),
      description: item.description.trim(),
    })),
    publications: profile.publications.map((item) => ({
      ...item,
      title: item.title.trim(),
      publisher: item.publisher.trim(),
      website: normalizeAbsoluteUrl(item.website ?? ""),
      description: item.description.trim(),
    })),
    references: profile.references.map((item) => ({
      ...item,
      name: item.name.trim(),
      title: item.title.trim(),
      organization: item.organization.trim(),
      relationship: item.relationship.trim(),
      email: (item.email ?? "").trim().toLowerCase(),
      phone: normalizePhoneValue(item.phone ?? ""),
    })),
    volunteer: profile.volunteer.map((item) => ({
      ...item,
      startDate: item.startDate.trim(),
      endDate: item.current ? "" : item.endDate.trim(),
    })),
  };

  return {
    ...sanitized,
    // Only genuinely custom sections survive a save. Anything else in here is a mirror left
    // over from a profile stored before the typed model; `unflattenLegacySections` has
    // already recovered those entries into the typed arrays above.
    customSections: (sanitized.customSections ?? []).filter((s) => s.kind === "custom"),
  };
}
