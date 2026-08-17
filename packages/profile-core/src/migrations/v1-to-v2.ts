import { unflattenLegacySections } from "../normalization/legacy-sections.js";

/**
 * Migration 1 -> 2:
 *
 * Converts unversioned or v1 profiles into v2 format:
 * - Recovers any legacy mirrored custom sections into typed section arrays.
 * - Stamping schemaVersion: 2.
 */
export function migrateV1ToV2(raw: Record<string, unknown>): Record<string, unknown> {
  const unflattened = unflattenLegacySections(raw);

  return {
    ...raw,
    ...unflattened,
    schemaVersion: 2,
  };
}
