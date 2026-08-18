/*
 * Historical entry point for the resume's field rules.
 *
 * Both the predicates and the zod primitives now come from `@veriworkly/profile-core`, which
 * the server imports too — the studio's copies of `phoneSchema`, the email rule, and the
 * date patterns had drifted from the server's, and reconciling them by hand was exactly the
 * maintenance the package removes. Nothing is declared here any more; the file exists so the
 * resume's several dozen import sites keep working.
 *
 * `phoneSchema` and `phoneOrEmptySchema` are the same rule. Empty is valid for both: an
 * incomplete profile must still be storable, and blocking a save on a blank optional field is
 * a UI concern, not a storage one. Both names are kept so it stays obvious that neither is
 * the stricter variant.
 */
export {
  isEmail,
  isEmailOrEmpty,
  isHttpUrl,
  isMonthDate,
  isYearDate,
  isValidPhoneValue,
  normalizePhoneValue,
  formatPhoneForDisplay,
  isLegacyUnqualifiedPhone,
  countPhoneDigits,
  monthDatePattern,
  yearDatePattern,
  phoneSchema,
  phoneSchema as phoneOrEmptySchema,
  emailOrEmptySchema,
  urlOrEmptySchema,
  monthDateSchema,
  yearDateSchema,
} from "@veriworkly/profile-core";
