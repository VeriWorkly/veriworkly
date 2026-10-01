import type { AtsRegionPackInput } from "../schema.js";

/**
 * Region packs: what differs by country rather than by language — how a national phone number
 * and an all-numeric date are written, the credentials of the national education system, and
 * the conventions a recruiter there holds a resume to.
 *
 * Credentials live here, not in the language packs, because an English resume carries them too:
 * "Abitur" from Germany, "Class XII" and "B.Com" from India.
 *
 * The rule adjustments name rules of the community policy. A date of birth or a photo is
 * expected in Germany and India and a liability in the US, where it invites age and appearance
 * bias; `weight: 0` turns the rule off for the region rather than passing it.
 */
const word = (body: string) => String.raw`(?<![\p{L}\p{M}])(?:${body})(?![\p{L}\p{M}])`;

export const US: AtsRegionPackInput = {
  id: "US",
  name: "United States",
  status: "verified",
  maintainers: [],
  phoneCountry: "US",
  dateOrder: "MDY",
  rules: {
    "ats-v2.privacy.dateOfBirth": { weight: 6, severity: "warning" },
    "ats-v2.format.photo": { weight: 6, severity: "warning" },
  },
};

export const DE: AtsRegionPackInput = {
  id: "DE",
  name: "Deutschland",
  status: "community",
  maintainers: [],
  phoneCountry: "DE",
  dateOrder: "DMY",
  rules: {
    "ats-v2.privacy.dateOfBirth": { weight: 0 },
    "ats-v2.format.photo": { weight: 0 },
  },
  degrees: {
    "2": word(String.raw`mittlere\s+reife|realschulabschluss|hauptschulabschluss`),
    "3": word(
      String.raw`abitur|fachabitur|(?:allgemeine\s+|fachgebundene\s+)?hochschulreife|fachhochschulreife|(?:abgeschlossene\s+)?berufsausbildung|ausbildung\s+(?:zum|zur|als)`,
    ),
    // Diplom (FH) is a bachelor's equivalent, and so, at DQR level 6, are a master craftsman
    // (Meister, alone or compounded: "Elektrotechnikermeister") and a state-certified technician
    // or business economist ("Staatlich geprüfter Techniker"). The compound prefix is bounded to
    // stay linear, and skips the Meister who hold no credential: caretaker, mayor, champion.
    "6": word(
      String.raw`dipl(?:om|\.)(?:-\p{L}+)?\.?\s*\(fh\)|\p{L}{0,30}(?<!haus|bürger|welt|europa|bundes|landes|kreis|stadt|vereins|kapell|konzert|ballett|schach)meister(?:in|prüfung|brief|titel)?|staatl(?:ich|\.)\s*gepr(?:üfte[nr]?|\.)\s+\p{L}+`,
    ),
    // The lookahead pair keeps "Diplom-Informatiker (FH)" from backtracking into a match here;
    // its optional dot keeps "Dipl.-Ing. (FH)" from matching as "Dipl.-Ing" before the dot.
    "7": word(
      String.raw`dipl(?:om|\.)(?:-\p{L}+)?\.?(?![\p{L}-])(?!\.?\s*\(fh\))|magister|staatsexamen`,
    ),
    "8": word(
      String.raw`promotion\s+(?:zum|zur|in)|promoviert|doktorarbeit|doktorgrad|dr\.\s?(?:rer|phil|ing|med)\.`,
    ),
  },
};

export const IN: AtsRegionPackInput = {
  id: "IN",
  name: "India",
  status: "community",
  maintainers: [],
  phoneCountry: "IN",
  dateOrder: "DMY",
  rules: {
    "ats-v2.privacy.dateOfBirth": { weight: 0 },
    "ats-v2.format.photo": { weight: 0 },
  },
  // Institutions named in transliterated Hindi: "Kendriya Vidyalaya", "Jamia ... Vishwavidyalaya".
  schoolWords: ["vidyalaya", "mahavidyalaya", "vishwavidyalaya", "vidyapeeth", "vidyapith"],
  degrees: {
    // The Secondary School Certificate (SSC) is the Class X board exam, not school-leaving.
    "2": word(
      String.raw`class\s+(?:x|10)(?:th)?|10th(?:\s+(?:standard|grade|class))?|matriculation|s\.?s\.?c\.?|secondary\s+school\s+certificate`,
    ),
    "3": word(
      String.raw`class\s+(?:xii|12)(?:th)?|12th(?:\s+(?:standard|grade|class))?|h\.?s\.?c\.?|intermediate\s+(?:\(|board|education|exam)|higher\s+secondary|senior\s+secondary|pre[\s-]university`,
    ),
    "6": word(
      String.raw`b\.?\s?com\.?|b\.?c\.?a\.?|b\.?b\.?a\.?|b\.\s?e\.?|b\.?\s?pharm\.?|ll\.?b\.?`,
    ),
    "7": word(
      String.raw`m\.?\s?com\.?|m\.?c\.?a\.?|m\.\s?e\.?|pgdm|pgdba|post[\s-]?graduate\s+diploma|m\.?b\.?b\.?s\.?|ll\.?m\.?`,
    ),
  },
};
