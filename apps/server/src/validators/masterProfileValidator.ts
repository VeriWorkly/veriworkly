import { z } from "zod";

import { masterProfileSchema } from "@veriworkly/profile-core";

/**
 * The master profile is defined once, in `@veriworkly/profile-core`, and imported here.
 *
 * This file used to hold a hand-written copy of the whole content schema, which had already
 * drifted from the studio's copy: different phone rules, narrower numeric ranges, `.strict()`
 * against the client's `.passthrough()`. Every one of those disagreements surfaced to users
 * as a save that failed with no explanation, because the client had no way to know the
 * server would refuse what it had just accepted.
 *
 * DEPLOY ORDER: when adding a field to the master profile, deploy the server first. Both
 * sides strip unknown keys, so a client-first deploy degrades to "the new field is ignored
 * until the server catches up" rather than a hard 400 on every save.
 */
export const masterProfileContentSchema = masterProfileSchema;

export const masterProfilePayloadSchema = z
  .object({
    profile: masterProfileContentSchema,
    expectedUpdatedAt: z.string().datetime().optional(),
  })
  .strip();

export type MasterProfilePayload = z.infer<typeof masterProfilePayloadSchema>;
