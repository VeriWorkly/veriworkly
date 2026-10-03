/**
 * Compiles a pattern a policy carries, always in Unicode mode.
 *
 * Unicode mode is what makes `\p{L}` and friends available to policy authors, so a heading or a
 * degree pattern can be written for German or Hindi as easily as for English. It is also
 * stricter: an escape of a character that needs none (`\-` outside a class, `\'`) is a syntax
 * error rather than a literal. `parseAtsPolicy` compiles every pattern this way, so a policy that
 * passes validation cannot fail here. A `v` flag already implies Unicode mode and is left alone.
 */
export function policyRegex(pattern: string, flags = "") {
  return new RegExp(pattern, /[uv]/.test(flags) ? flags : `${flags}u`);
}
