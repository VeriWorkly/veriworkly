import type { AtsEnginePolicy } from "../policy/schema.js";
import { wordListPattern } from "../text/text.js";
import { titleWordsOf } from "./experience.js";
import { isSectionHeading } from "./sections.js";
import { memo } from "../util/memo.js";

/**
 * Contact recovery.
 *
 * The email and link patterns stay in source rather than in the policy: they match address
 * grammars (RFC-ish email, URL) rather than any language's vocabulary, so they do not move when
 * the resume is written in another language. The policy owns words; this owns punctuation.
 * Phone numbers are country-shaped, not language-shaped, and are read in `phone.ts`.
 */

/**
 * Bounded on purpose. The unbounded form (`[A-Z0-9._%+-]+@[A-Z0-9.-]+`) restarts its scan at
 * every position of a long run like "a.a.a.…", which is quadratic: a 50k-character input took
 * over a second per call, and a scan evaluates this pattern about nine times. The lookbehind
 * anchors a match to the start of a local-part run, and the lengths are RFC 5321's own limits.
 */
export const EMAIL =
  /(?<![A-Z0-9._%+-])[A-Z0-9._%+-]{1,64}@[A-Z0-9-]{1,63}(?:\.[A-Z0-9-]{1,63}){0,8}\.[A-Z]{2,24}\b/i;
export const LINK = /(?:https?:\/\/|www\.)[^\s|,]+|(?:linkedin\.com|github\.com)\/[^\s|,]+/gi;

/**
 * A word of a name: capitalised in a script with case ("Jane", "DOE", "O'Brien", "F."), or any
 * word in a script without one (Devanagari, Arabic, Han), where capitals carry no signal.
 */
const NAME_WORD = /^(?:\p{Lu}|\p{Lo})[\p{L}\p{M}'’.-]*$/u;

/** A credential after a name: short, and read as an abbreviation — two capitals or a full stop. */
const isPostNominal = (token: string) =>
  /^[\p{L}.]{2,8}$/u.test(token) && (token.includes(".") || /\p{Lu}[\p{L}.]*\p{Lu}/u.test(token));

/**
 * The line without the credentials after the name: "Jane Doe, PhD", "Raj Patel, M.D., CPA".
 *
 * Walks the comma-separated parts from the end and stops at the first that is not all
 * credentials, so each part is read once. It was a regex repeating a group of letters, which
 * tried every partition of a letter run that did not end the line: a 60-byte name line held the
 * thread for seconds, and each further letter multiplied that.
 */
function withoutPostNominals(line: string) {
  const parts = line.split(",");
  let cut = parts.length;
  let stripped = false;
  while (cut > 1) {
    const tokens = parts[cut - 1].trim().split(/\s+/).filter(Boolean);
    // An empty part is only a trailing comma ("Jane Doe, PhD, "); anywhere else it ends the run.
    if (tokens.length === 0 ? cut !== parts.length : !tokens.every(isPostNominal)) break;
    stripped ||= tokens.length > 0;
    cut -= 1;
  }
  return stripped ? parts.slice(0, cut).join(",") : line;
}

const birthPattern = memo(
  (rp: AtsEnginePolicy["resumeParse"]) =>
    new RegExp(`${wordListPattern(rp.dateOfBirthLabels)}.{0,40}?\\d`, "iu"),
);

/**
 * Whether the resume states a date of birth: one of the policy's labels with a number after it
 * on the same line ("Date of birth: 04.05.1990", "Born 1990"). The number is what separates the
 * personal detail from "a born leader".
 */
export function statesDateOfBirth(lines: string[], policy: AtsEnginePolicy) {
  const re = birthPattern(policy.resumeParse);
  return lines.some((line) => re.test(line));
}

const nameVocabulary = memo(
  ({ nameParticles, documentTitles }: AtsEnginePolicy["resumeParse"]) => ({
    particles: new RegExp(`^(?:${nameParticles.join("|")})$`, "u"),
    titles: new RegExp(`^(?:${documentTitles.join("|")})$`, "iu"),
  }),
);

/**
 * The candidate's name, taken from the top of the document.
 *
 * An ATS reads the name from the header block, so this looks only at the first few lines and
 * takes the first that reads like a person rather than a contact detail or a job title. Getting
 * this wrong is cheap — it is reported, not scored on its content — but not finding one at all
 * is worth knowing, because it usually means the name is inside an image or a text box.
 *
 * A name is two to five name words, with lowercase particles allowed between them ("Ludwig van
 * Beethoven") and credentials after a comma left off ("Jane Doe, PhD"). An all-caps banner
 * qualifies. A single word qualifies only as the very first line — that is where a mononym
 * ("Suharto") sits, and anywhere lower a lone capitalised word is far more likely a heading — and
 * never when it is a section heading or the document's own title ("Resume").
 */
export function findName(lines: string[], policy: AtsEnginePolicy) {
  const { particles, titles } = nameVocabulary(policy.resumeParse);
  const top = lines
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 6);

  for (const [index, line] of top.entries()) {
    if (EMAIL.test(line) || /\d/.test(line) || titles.test(line)) continue;

    const name = withoutPostNominals(line).trim();
    const words = name.split(/\s+/);
    const named = words.filter((word) => !particles.test(word));
    if (named.length === 0 || named.length > 5 || words.length > 7) continue;
    if (!named.every((word) => NAME_WORD.test(word))) continue;
    // Particles sit between the words they join, never at the ends.
    if (particles.test(words[0]) || particles.test(words[words.length - 1])) continue;
    if (named.length === 1 && index > 0) continue;
    // A headline ("Senior Software Engineer") has the shape of a name, and is what this used to
    // return when the real name was in an image.
    if (isSectionHeading(name, policy) || titleWordsOf(policy).test(name)) continue;
    return name;
  }
  return "";
}
