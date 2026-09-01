/**
 * Raised when a supplied policy does not satisfy the schema.
 *
 * The package deliberately has no idea what an HTTP status code is: it is a library that scores
 * text, and a caller might be a server, a CLI, or a browser tab. So an invalid policy surfaces as
 * a typed error carrying the structured issues, and the host decides what that means — the server
 * maps it to a 503 and logs the offending fields, which is a policy decision that belongs to the
 * host rather than to the engine.
 *
 * `issues` is kept structured rather than pre-formatted for the same reason: the host chooses how
 * much of it to log and how much (usually none) to show a caller.
 */
export type AtsPolicyIssue = {
  /** Dotted path to the offending field, e.g. `rules.3.weight`. */
  path: string;
  message: string;
};

export class AtsPolicyError extends Error {
  readonly issues: AtsPolicyIssue[];

  constructor(message: string, issues: AtsPolicyIssue[]) {
    super(message);
    this.name = "AtsPolicyError";
    this.issues = issues;

    Object.setPrototypeOf(this, new.target.prototype);

    // V8 only, and typed as such: the package compiles without Node's lib so that a build
    // failure is what tells us if something host-specific has crept in.
    const capture = (Error as unknown as { captureStackTrace?: (t: object, c: unknown) => void })
      .captureStackTrace;
    if (capture) capture(this, this.constructor);
  }
}
