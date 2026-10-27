import type { MasterProfile } from "@/types/resume";

import { masterProfileSchema } from "@veriworkly/profile-core";

import { WORKSPACE_BACKUP_FORMAT } from "@/features/documents/services/import-service";
import { toMasterProfileData } from "@/features/resume/services/master-profile";

import { prepareMasterProfileForSave } from "../master/master-utils";

export function stringifyProfile(profile: MasterProfile) {
  return JSON.stringify(profile, null, 2);
}

export type ProfileJsonCheck =
  { ok: true; profile: MasterProfile } | { ok: false; kind: "syntax" | "schema"; message: string };

function isAccountBackup(value: unknown): value is { masterProfile?: unknown } {
  return (value as { format?: unknown } | null)?.format === WORKSPACE_BACKUP_FORMAT;
}

/**
 * Whether the text is JSON at all, then whether it is a profile, with the first reason it is
 * not. An account backup file is read for the Master Profile it carries. The profile comes back
 * as the load path gives it, legacy sections unflattened, so a save keeps them.
 */
export function checkMasterProfileJson(value: string): ProfileJsonCheck {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch (error) {
    return {
      ok: false,
      kind: "syntax",
      message: error instanceof Error ? error.message : "This is not valid JSON.",
    };
  }

  if (isAccountBackup(parsed)) {
    if (!parsed.masterProfile) {
      return { ok: false, kind: "schema", message: "This backup has no Master Profile." };
    }

    parsed = parsed.masterProfile;
  }

  const validated = masterProfileSchema.safeParse(parsed);

  if (!validated.success) {
    const firstIssue = validated.error.issues[0];
    const path = firstIssue?.path.length ? `${firstIssue.path.join(".")}: ` : "";

    return {
      ok: false,
      kind: "schema",
      message: `${path}${firstIssue?.message ?? "Profile JSON does not match expected schema."}`,
    };
  }

  const profile = toMasterProfileData(validated.data);

  return profile
    ? { ok: true, profile }
    : { ok: false, kind: "schema", message: "Profile JSON does not match expected schema." };
}

export function parseMasterProfileJson(value: string) {
  const checked = checkMasterProfileJson(value);

  if (!checked.ok) throw new Error(checked.message);

  return checked.profile;
}

/**
 * The JSON editor's save: the same cleaning and rules as the guided editor, so it never stores
 * a profile the guided editor would then refuse to save.
 */
export function prepareMasterProfileJsonForSave(value: string): MasterProfile {
  const prepared = prepareMasterProfileForSave(parseMasterProfileJson(value));

  if (!prepared.ok) throw new Error(prepared.issues.join(" "));

  return prepared.profile;
}

export function buildProfileExportName() {
  return `master-profile-${new Date().toISOString().split("T")[0]}.json`;
}
