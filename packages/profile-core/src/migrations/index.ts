import { CURRENT_SCHEMA_VERSION } from "../schema/schema.js";
import { migrateV1ToV2 } from "./v1-to-v2.js";

export interface ProfileMigration {
  from: number;
  to: number;
  migrate(input: Record<string, unknown>): Record<string, unknown>;
}

export class NewerSchemaVersionError extends Error {
  readonly version: number;
  readonly maxSupportedVersion: number;

  constructor(version: number, maxSupportedVersion: number) {
    super(
      `This profile was saved by a newer version (${version}) of the application. ` +
        `The current version only supports up to version ${maxSupportedVersion}. Please reload the page.`,
    );
    this.name = "NewerSchemaVersionError";
    this.version = version;
    this.maxSupportedVersion = maxSupportedVersion;
  }
}

export const PROFILE_MIGRATIONS: readonly ProfileMigration[] = [
  {
    from: 1,
    to: 2,
    migrate: migrateV1ToV2,
  },
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Migrates a master profile payload forward to CURRENT_SCHEMA_VERSION.
 *
 * Requirements:
 * - Pure and defensive: handles missing, partial, or malformed inputs without throwing.
 * - Guard against future versions: throws `NewerSchemaVersionError` if `schemaVersion > CURRENT_SCHEMA_VERSION`
 *   so UI can alert the user to refresh rather than silently stripping unknown fields.
 */
export function migrateMasterProfile(raw: unknown): Record<string, unknown> | unknown {
  if (!isRecord(raw)) {
    return raw;
  }

  const rawVersion = typeof raw.schemaVersion === "number" ? raw.schemaVersion : 1;

  if (rawVersion > CURRENT_SCHEMA_VERSION) {
    throw new NewerSchemaVersionError(rawVersion, CURRENT_SCHEMA_VERSION);
  }

  let current = { ...raw };
  let version = rawVersion;

  for (const migration of PROFILE_MIGRATIONS) {
    if (migration.from === version && migration.to <= CURRENT_SCHEMA_VERSION) {
      current = migration.migrate(current);
      version = migration.to;
    }
  }

  current.schemaVersion = CURRENT_SCHEMA_VERSION;
  return current;
}
