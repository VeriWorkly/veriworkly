/**
 * What follows a bare two-letter form that is a US state code rather than a degree, when no
 * comma comes before it: a ZIP code ("Boston MA 02115"), a year ("Medford MA 2016", "Boston
 * MA, 2015") or a month and year ("Chestnut Hill, MA Sep 2014"). A degree is followed by its
 * subject instead ("MS Computer Science, 2016"); "USA", "or" and "and" are not one.
 */
const STATE_CODE_AFTER = String.raw`\s+\d{5}(?!\d)|(?:,\s*|\s+)\d{4}(?!\d)|\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}(?!\d)`;
/**
 * After a comma, a bare form is a degree only when its subject follows ("Stanford University, MS
 * in Computer Science", "University of Chicago, MA Economics", "Harvard, MA (Economics)"); at
 * the end of the line, or before a ZIP code, a year or another comma, it is the state of the
 * city before it ("Cambridge, MA", "Boston, MA 02115"). Decided by what follows, not by the comma.
 */
const SUBJECT_AFTER = String.raw`\s+(?!(?:or|and|usa?)(?![a-z]))\p{L}|\s*\(`;
/** "MS Excel", "MS Teams": Microsoft, not a Master's. */
const MS_PRODUCT_AFTER = String.raw`\s+(?:excel|office|word|access|teams|project|outlook|powerpoint|windows|azure|dynamics|sql|visio|sharepoint)\b`;

/**
 * The community policy's parsing vocabulary. Month names and the words for "still here" are
 * the schema's defaults, so they are not repeated here.
 */
export const DEFAULT_RESUME_PARSE = {
  sections: {
    experience: String.raw`^(?:(?:work|professional|relevant)\s+)?(?:experience|employment|history)`,
    education: String.raw`^education`,
    skills: String.raw`^(?:(?:technical|core)\s+)?skills|^technologies`,
    projects: String.raw`^projects`,
    other: String.raw`^(?:summary|objective|profile|certifications?|awards?|publications?|languages|interests|volunteering|references|links|online\s+profiles?|achievements|hobbies)`,
  },
  titleWords: [
    "engineer",
    "developer",
    "manager",
    "director",
    "designer",
    "analyst",
    "architect",
    "consultant",
    "lead",
    "head",
    "officer",
    "scientist",
    "specialist",
    "administrator",
    "intern",
    "president",
    "founder",
    "coordinator",
    "supervisor",
    "associate",
    "assistant",
    "technician",
  ],
  schoolWords: [
    "university",
    "college",
    "institute",
    "school",
    "academy",
    "polytechnic",
    "seminary",
  ],
  // Bare MA and MS are the ambiguous two-letter forms: they are also US state codes ("Cambridge,
  // MA"; see STATE_CODE_AFTER and SUBJECT_AFTER above, which tell the two apart by what
  // follows), and "MS" before a product name is Microsoft. No state is BA or BS, so those read
  // as degrees wherever they stand. Dotted and
  // spelled-out forms stay unconditional. "Associate" alone is a job title, not a degree, and
  // "certificate" alone is as likely to be an SSL certificate as a credential.
  // A bare MS/MA is also not one after a number ("900 ms"), before a hyphen ("MS-Excel") or a ZIP
  // code ("Boston MA 02115"), or as a salutation before a name ("Ms. Priya"); the pattern is
  // matched case-insensitively, so the salutation is told apart by its dot, not its capital.
  // "Master Data Management" is a discipline, not a degree.
  // "Secondary School Certificate" is India's Class X (level 2, the IN region's), and "High
  // School (Class X)" names that same exam, so neither is claimed at level 3 here.
  // Keyed by ISCED 2011 level. Level 3 is a school-leaving qualification; level 4 is any other
  // diploma or certificate, so its pattern steps around the school ones, which would otherwise
  // be recorded at the higher level.
  degrees: {
    "3": String.raw`(?:\b|^)((?:high\s+school(?!\s*\(\s*class\s+(?:x|10)(?:th)?(?![a-z]))|secondary\s+school(?!\s+certificate))(?:\s+(?:diploma|certificate))?|g\.?e\.?d\.?|a[\s-]levels?)(?![a-z])`,
    "4": String.raw`(?:\b|^)((?<!(?:high|secondary)\s+school\s+)diploma|(?:graduate\s+)?certificate\s+(?:in|of)\b)(?![a-z])`,
    "5": String.raw`(?:\b|^)(associate(?:'?s)?\s+(?:degree|of\s+[a-z]+)|a\.a\.s?\.?|(?<!,\s*)aas?(?=\s+(?:in|of)\b))(?![a-z])`,
    "6": String.raw`(?:\b|^)(bachelor(?:'?s)?(?:\s+of\s+[a-z]+)?|b\.s\.c?\.?|b\.?sc\.?|b\.a\.|b\.?eng\.?|b\.?tech\.?|b[as])(?![a-z])`,
    "7": String.raw`(?:\b|^)((?<!scrum\s)master(?!\s+data(?![a-z]))(?:'?s)?(?:\s+of\s+[a-z]+)?|m\.s\.c?\.?|m\.?sc\.?|m\.a\.|m\.?eng\.?|m\.?b\.?a\.?|m\.?tech\.?|(?<=,\s*)m[as](?=${SUBJECT_AFTER})(?!${STATE_CODE_AFTER}|${MS_PRODUCT_AFTER})|(?<!,\s*|\d\s?)m[as](?!-|\.\s+\p{L}|${STATE_CODE_AFTER}|${MS_PRODUCT_AFTER}))(?![a-z])`,
    "8": String.raw`(?:\b|^)(doctorate|ph\.?d\.?|d\.?phil\.?)(?![a-z])`,
  },
};
