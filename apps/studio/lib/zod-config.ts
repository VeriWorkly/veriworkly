import { z } from "zod";

/**
 * zod compiles object validators with `new Function` when it may. The CSP has no 'unsafe-eval',
 * so its one probe for that is refused and logged as a CSP violation on every page. Jitless
 * validation skips the probe; the same schemas validate the same way.
 */
z.config({ jitless: true });
