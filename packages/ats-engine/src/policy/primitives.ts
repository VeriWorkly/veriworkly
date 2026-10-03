import { z } from "zod";

import { wordListRegex } from "../text/text.js";
import { policyRegex } from "./regex.js";

/**
 * A string the engine will hand to `new RegExp`, checked here rather than at match time.
 *
 * Without this a policy that satisfies every other constraint still throws `SyntaxError` on the
 * first request that evaluates the rule — which is the exact failure the boot-time validation
 * exists to prevent: a process that reports itself healthy while an endpoint 500s. The pattern is
 * operator-supplied and never reaches a caller, so naming the offending field in the issue is
 * safe and is the only way to debug a file the process cannot show you.
 *
 * Compiled in Unicode mode, as the engine compiles it (see `policyRegex`): that is where an
 * escape a pattern written for the old non-Unicode engine relied on (`\-` outside a class) fails.
 *
 * Compilation only. It says nothing about whether the pattern is *correct* — that is what the
 * calibration suite is for.
 */
export const regexString = (label: string) =>
  z
    .string()
    .min(1)
    .superRefine((pattern, ctx) => {
      try {
        policyRegex(pattern);
      } catch (error) {
        ctx.addIssue({
          code: "custom",
          message: `${label} is not a valid regular expression in Unicode mode: ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
      }
    });

/**
 * Regex flags, which `new RegExp` rejects just as loudly as a malformed pattern — an unknown
 * letter or a repeated one is a `SyntaxError`, so it is validated in the same place.
 *
 * `y` (sticky) compiles but tests one position only — wherever the last match left off — so a
 * rule carrying it passes or fails at random rather than reading the text; it is refused.
 */
export const regexFlags = z
  .string()
  .default("")
  .superRefine((flags, ctx) => {
    try {
      new RegExp("", flags);
    } catch (error) {
      ctx.addIssue({
        code: "custom",
        message: `flags "${flags}" are not valid regular-expression flags: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
      return;
    }
    if (flags.includes("y"))
      ctx.addIssue({
        code: "custom",
        message: `flags "${flags}": the sticky flag "y" is not supported`,
      });
  });

/**
 * A rule's pattern compiled with the rule's own flags, as the scorer compiles it. Each is valid
 * alone yet the pair can still fail: `[(]` is a class in Unicode mode and a syntax error under
 * `v`. Added to the rule object, since neither field sees the other.
 */
export function checkPatternWithFlags(
  rule: { pattern?: string; flags: string },
  ctx: z.RefinementCtx,
) {
  if (!rule.pattern) return;
  try {
    policyRegex(rule.pattern, rule.flags);
  } catch (error) {
    ctx.addIssue({
      code: "custom",
      path: ["pattern"],
      message: `pattern is not a valid regular expression with flags "${rule.flags}": ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
  }
}

/**
 * A word list the engine joins with `|` into one alternation, unescaped.
 *
 * That makes a metacharacter in any single entry a failure of the *whole* pattern, not just of
 * that word: `c++` in `titleWords` raises "Nothing to repeat" and takes down every parse. The
 * entries are deliberately not escaped at use — a policy author can legitimately write a small
 * pattern like `sr\.?` — so the check is that the assembled alternation compiles, which is the
 * thing that actually has to hold.
 */
export const wordList = (label: string) =>
  z
    .array(z.string().min(1))
    .min(1)
    .superRefine((words, ctx) => {
      try {
        wordListRegex(words);
      } catch (error) {
        ctx.addIssue({
          code: "custom",
          message: `${label} does not assemble into a valid regular expression: ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
      }
    });

/**
 * A word the matcher compares with lower-cased text: lower-cased here, so "Event Sourcing" in a
 * policy matches as written, and never empty, since "" matches everywhere.
 */
export const term = z
  .string()
  .min(1)
  .transform((value) => value.toLowerCase());

/** Credential patterns keyed by ISCED 2011 level; see `resumeParse.degrees`. */
export const iscedDegrees = z.object({
  "2": regexString("degrees.2").optional(),
  "3": regexString("degrees.3").optional(),
  "4": regexString("degrees.4").optional(),
  "5": regexString("degrees.5").optional(),
  "6": regexString("degrees.6").optional(),
  "7": regexString("degrees.7").optional(),
  "8": regexString("degrees.8").optional(),
});

export type IscedDegrees = z.output<typeof iscedDegrees>;
