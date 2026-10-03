import { z } from "zod";

import { iscedDegrees, regexString, wordList, type IscedDegrees } from "../primitives.js";

/**
 * Vocabulary the resume parser needs. Data, so it lives in the policy alongside the rules rather
 * than in the source — a new job-title word or degree spelling should not require a deploy.
 */
export const resumeParseSchema = z.object({
  sections: z.object({
    experience: regexString("sections.experience"),
    education: regexString("sections.education"),
    skills: regexString("sections.skills"),
    projects: regexString("sections.projects"),
    /** Any other heading. Classified only so that it terminates the block above it. */
    other: regexString("sections.other"),
  }),
  /**
   * Month name -> month number, for the date spellings a resume actually uses.
   *
   * Language-bound, so it belongs in the policy rather than in the parser. It was previously a
   * constant in source, which would have made a second locale a rewrite of the date scanner
   * instead of another policy file. Optional, and defaulted to English.
   *
   * Each key is a whole word, matched with an optional full stop: list every spelling to read,
   * "jan" and "january" alike. (An abbreviation used to stretch to any longer word, which read
   * "Novartis 2018" as November.)
   */
  months: z.record(z.string(), z.number().int().min(1).max(12)).default({
    jan: 1,
    january: 1,
    feb: 2,
    february: 2,
    mar: 3,
    march: 3,
    apr: 4,
    april: 4,
    may: 5,
    jun: 6,
    june: 6,
    jul: 7,
    july: 7,
    aug: 8,
    august: 8,
    sep: 9,
    sept: 9,
    september: 9,
    oct: 10,
    october: 10,
    nov: 11,
    november: 11,
    dec: 12,
    december: 12,
  }),
  /** The ways a resume says a role is still current. Language-bound, hence data. */
  openEnded: z
    .array(z.string().min(1))
    .min(1)
    .default(["present", "current", "now", "ongoing", "to date", "till date"]),
  /** Words between the two ends of a date range besides a dash: "2019 to 2022", "2019 bis 2022". */
  rangeWords: wordList("rangeWords").default(["to", "until", "through"]),
  /** Words before a lone start date that make it a current role: "since 2019", "seit 03/2019". */
  sinceWords: wordList("sinceWords").default(["since"]),
  /** Words joining a job title to its employer on one line: "Engineer at Acme". */
  employerWords: wordList("employerWords").default(["at"]),
  /**
   * What the top of a resume says in place of a name. Never taken as the candidate's name,
   * which matters now that a single word can be one.
   */
  documentTitles: wordList("documentTitles").default([
    "resume",
    "résumé",
    "curriculum vitae",
    "cv",
  ]),
  /**
   * Lowercase words a name may hold between its capitalised ones: "Ludwig van Beethoven",
   * "María de la Cruz", "Ahmad bin Ismail". One list for every language, because names travel.
   */
  nameParticles: wordList("nameParticles").default([
    "van",
    "von",
    "der",
    "den",
    "de",
    "del",
    "della",
    "la",
    "le",
    "da",
    "di",
    "du",
    "dos",
    "das",
    "y",
    "ter",
    "ten",
    "bin",
    "binti",
    "ibn",
    "al",
    "el",
  ]),
  /**
   * Lowercase words a capitalised heading may join its words with: "Skills and Tools". Any other
   * lowercase word after the heading word reads as prose ("History of Art BA").
   */
  headingConnectors: wordList("headingConnectors").default(["and"]),
  /** Labels a resume states a date of birth under: "Date of birth: 4 May 1990". */
  dateOfBirthLabels: wordList("dateOfBirthLabels").default([
    "date of birth",
    String.raw`d\.o\.b\.?`,
    "dob",
    "born",
  ]),
  /**
   * How an all-numeric date with a day is ordered — "03/04/2021" is 4 March in the US and 3 April
   * in Germany and India. Only the month matters to tenure, so a wrong guess costs at most a
   * month or two; a part over 12 settles it either way. Set by a region pack.
   */
  dateOrder: z.enum(["MDY", "DMY", "YMD"]).default("MDY"),
  /**
   * ISO 3166 countries a phone number without a country code is tried as, in order. A number
   * with one ("+49 30 1234567") is read as what it says. Set by a region pack.
   */
  phoneRegions: z
    .array(z.string().regex(/^[A-Z]{2}$/, "a two-letter ISO 3166 country code"))
    .min(1)
    .default(["US"]),
  /** Words that mark a fragment as a job title rather than an employer name. */
  titleWords: wordList("titleWords"),
  /** Words that mark a fragment as an institution. */
  schoolWords: wordList("schoolWords"),
  /**
   * One pattern per ISCED 2011 level (see `AtsIscedLevel`), naming the credentials at it. Levels
   * are tried highest first, so a line naming two credentials is recorded at the higher one —
   * which is why a level's pattern must not also match a credential of a lower one ("high school
   * diploma" is level 3, not the diploma of level 4). A policy written before ISCED, keyed
   * diploma/associate/bachelor/master/doctorate, is still read: as levels 4, 5, 6, 7 and 8.
   */
  degrees: z
    .union([
      z
        .object({
          diploma: regexString("degrees.diploma"),
          associate: regexString("degrees.associate"),
          bachelor: regexString("degrees.bachelor"),
          master: regexString("degrees.master"),
          doctorate: regexString("degrees.doctorate"),
        })
        .transform((legacy): IscedDegrees => ({
          "4": legacy.diploma,
          "5": legacy.associate,
          "6": legacy.bachelor,
          "7": legacy.master,
          "8": legacy.doctorate,
        })),
      iscedDegrees,
    ])
    .refine((degrees) => Object.values(degrees).some(Boolean), {
      message: "degrees must name at least one level",
    }),
});
