/**
 * An education level on the ISCED 2011 scale (UNESCO), which every national system maps onto:
 * 2 lower secondary (India's Class X), 3 upper secondary (Abitur, Class XII, a US high school
 * diploma), 4 post-secondary non-tertiary, 5 short-cycle tertiary (associate), 6 bachelor's or
 * equivalent, 7 master's or equivalent (a German Diplom), 8 doctoral.
 */
export type AtsIscedLevel = 2 | 3 | 4 | 5 | 6 | 7 | 8;

/**
 * The five labels the engine reported before ISCED. Derived from `isced` (2–4 → diploma) and kept
 * for one minor version; read `isced` instead.
 */
export type AtsDegreeLevel = "diploma" | "associate" | "bachelor" | "master" | "doctorate";

export type AtsParsedDate = { year: number; month: number | null };

/** One row of work history, in the shape an applicant tracking system stores it. */
export type AtsParsedRole = {
  title: string;
  employer: string;
  start: AtsParsedDate | null;
  end: AtsParsedDate | null;
  current: boolean;
};

export type AtsParsedEducation = {
  school: string;
  credential: string;
  isced: AtsIscedLevel | null;
  /** @deprecated Derived from `isced`; read that. */
  level: AtsDegreeLevel | null;
  end: AtsParsedDate | null;
};

/** The groups of recovered fields that carry a provenance. */
export type AtsParsedField = "name" | "email" | "phone" | "roles" | "education" | "skills";

/**
 * Where a recovered field came from.
 *
 * - `parser` — read from the document text by the deterministic parser: what an ATS would see.
 * - `structured` — taken from typed fields of an `AtsResumeDocument`; nothing was parsed.
 * - `ai` — recovered by a model after the parser missed it, and grounded against the text.
 * - `none` — not recovered at all.
 *
 * Kept per field group rather than inferred by diffing before and after, so a report can say
 * truthfully which values a parser read and which a model read — the two are different claims.
 */
export type AtsProvenance = "parser" | "structured" | "ai" | "none";

/**
 * What a parser recovers from the document — the fields a recruiter actually searches on.
 *
 * Returned to the caller as well as scored, because showing the candidate the rows we recovered
 * is more useful than any number: an empty employer or a missing date range is a column the
 * hiring team's filter cannot match, and seeing it is what makes that concrete.
 */
export type AtsParsedResume = {
  name: string;
  email: string;
  phone: string;
  links: string[];
  roles: AtsParsedRole[];
  education: AtsParsedEducation[];
  skills: string[];
  /** Calendar months covered by at least one role, so overlapping jobs are not double counted. */
  monthsOfExperience: number | null;
  highestIsced: AtsIscedLevel | null;
  /** @deprecated Derived from `highestIsced`; read that. */
  highestDegree: AtsDegreeLevel | null;
  provenance: Record<AtsParsedField, AtsProvenance>;
};
