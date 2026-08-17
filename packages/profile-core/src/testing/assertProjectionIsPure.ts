import { deepClone } from "../common/primitives.js";
import type { MasterProfileData } from "../schema/types.js";

/**
 * Universal contract assertion for projection functions.
 *
 * Verifies the invariants every projection in @veriworkly/profile-core must satisfy:
 * 1. Purity: Input master profile is completely unchanged (deep-equal before and after execution).
 * 2. Reference isolation: Modifying the output object graph cannot mutate the input master fixture.
 * 3. Totality: Never throws when passed a valid master profile fixture.
 */
export function assertProjectionIsPure<TOutput>(
  project: (master: MasterProfileData) => TOutput,
  fixture: MasterProfileData,
): TOutput {
  const snapshotBefore = JSON.stringify(fixture);
  const clone = deepClone(fixture);

  const output = project(clone);

  // 1. Assert input wasn't mutated during projection execution
  const snapshotAfter = JSON.stringify(clone);
  if (snapshotBefore !== snapshotAfter) {
    throw new Error(
      `assertProjectionIsPure failed: Projection function mutated its input master profile argument!`,
    );
  }

  // 2. Assert output is structurally isolated from input (mutating output does not affect clone)
  if (typeof output === "object" && output !== null) {
    try {
      (output as Record<string, unknown>).__test_injected_mutation__ = "mutated";
      if ("__test_injected_mutation__" in (clone as unknown as Record<string, unknown>)) {
        throw new Error(
          `assertProjectionIsPure failed: Mutating output modified the input master profile (shared references detected)!`,
        );
      }
    } finally {
      delete (output as Record<string, unknown>).__test_injected_mutation__;
    }
  }

  return output;
}
