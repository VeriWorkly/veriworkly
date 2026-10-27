import { z } from "zod";

import {
  projectToResume,
  masterProfileSchema,
  normalizeMasterProfile,
  createEmptyMasterProfile,
  salvageMasterProfile as salvageAgainstBase,
  type MasterProfileData,
} from "@veriworkly/profile-core";

import type { ResumeData } from "@/types/resume";

import { ApiRequestError, fetchApiData } from "@/utils/fetchApiData";

import { MASTER_PROFILE_STORAGE_KEY } from "@/lib/constants";

import { isRecord } from "@/lib/is-record";
import { useUserStore } from "@/store/useUserStore";

import { normalizeResumeData } from "@/features/resume/utils/normalize-data";
import { normalizeFontFamilyId } from "@/features/documents/constants/fonts";
import { safeSetLocalStorageItem } from "@/features/documents/services/storage/safe-local-storage";

/** Where an unparseable stored value is parked instead of being deleted. */
const MASTER_PROFILE_CORRUPT_KEY = `${MASTER_PROFILE_STORAGE_KEY}:corrupt`;

interface MasterProfileState {
  updatedAt: string;
  profile: MasterProfileData;
}

interface MasterProfileSummaryState {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  emailVerified: boolean;
  autoSyncEnabled: boolean;
  shareResumeCount: number;
}

interface MasterProfileBundleState {
  updatedAt: string;
  profile: MasterProfileData;
  summary: MasterProfileSummaryState | null;
}

/**
 * The outcomes of a database load are not interchangeable, and collapsing them all to
 * `null` is what made "your profile did not load" and "you have no profile yet" look
 * identical to every caller — including the one that then quietly served demo data.
 *
 * `unparseable` carries the row's `updatedAt`: the row exists, so a save over it has to send
 * that cursor or the server refuses it.
 */
export type MasterProfileLoadResult =
  | { status: "ok"; bundle: MasterProfileBundleState }
  | { status: "empty" }
  | { status: "unparseable"; raw: unknown; updatedAt: string }
  | { status: "error"; error: unknown };

/**
 * The device cache, read. `corrupt` means bytes were stored and could not be read at all;
 * they are parked under the `:corrupt` key, and the caller decides what to show instead.
 */
export type LocalMasterProfileResult =
  { status: "ok"; profile: MasterProfileData } | { status: "empty" } | { status: "corrupt" };

const masterProfileStateSchema = z
  .object({
    updatedAt: z.string().optional(),
    profile: z.unknown(),
  })
  .passthrough();

function isBrowser() {
  return typeof window !== "undefined";
}

/**
 * Maps a stored font id onto one the studio can actually render.
 *
 * Not a `.transform()` inside the schema: the schema is shared with the server and the
 * portfolio, and neither has any business importing the studio's font catalog.
 */
function withNormalizedFont(profile: MasterProfileData): MasterProfileData {
  const fontFamily = normalizeFontFamilyId(profile.customization.fontFamily);

  if (fontFamily === profile.customization.fontFamily) {
    return profile;
  }

  return {
    ...profile,
    customization: { ...profile.customization, fontFamily },
  };
}

/**
 * Merges over an empty profile, then applies the studio-only font mapping. Empty, not sample
 * content: anything merged in here is saved back and projected into every new document.
 */
function normalizeProfile(value: Partial<MasterProfileData> | null | undefined) {
  return withNormalizedFont(normalizeMasterProfile(value));
}

/** A profile with nothing in it, for an editor opened by someone who has not written one. */
export function createEmptyStudioMasterProfile(): MasterProfileData {
  return normalizeProfile(createEmptyMasterProfile());
}

/**
 * A stored or pasted profile as the editors hold it: validated, migrated, legacy sections
 * unflattened into their typed arrays. `null` when it is not a profile at all.
 */
export function toMasterProfileData(value: unknown) {
  const parsed = masterProfileSchema.safeParse(value);

  if (!parsed.success) {
    return null;
  }

  return normalizeProfile(parsed.data);
}

/** Field-by-field rescue of whatever in `raw` is still valid. */
export function salvageMasterProfile(raw: unknown): MasterProfileData {
  return withNormalizedFont(salvageAgainstBase(raw));
}

/**
 * Parks the bytes we could not read instead of deleting them.
 *
 * Deleting on a parse failure would destroy the only copy of the user's data at the exact
 * moment the storage layer admits it cannot read it. The copy stays recoverable by hand from
 * devtools, and by us if a migration turns out to be what was needed.
 */
function backUpCorruptProfile(rawValue: string) {
  safeSetLocalStorageItem(window.localStorage, MASTER_PROFILE_CORRUPT_KEY, rawValue);

  console.warn(
    `Stored master profile could not be parsed. A copy was kept at "${MASTER_PROFILE_CORRUPT_KEY}".`,
  );
}

export function loadMasterProfileFromLocalStorage(): LocalMasterProfileResult {
  if (!isBrowser()) {
    return { status: "empty" };
  }

  const rawValue = window.localStorage.getItem(MASTER_PROFILE_STORAGE_KEY);

  if (!rawValue) {
    return { status: "empty" };
  }

  let stored: unknown;

  try {
    stored = JSON.parse(rawValue);
  } catch {
    backUpCorruptProfile(rawValue);
    return { status: "corrupt" };
  }

  const parsed = masterProfileStateSchema.safeParse(stored);

  if (!parsed.success) {
    backUpCorruptProfile(rawValue);
    return { status: "corrupt" };
  }

  const parsedProfile = toMasterProfileData(parsed.data.profile);

  if (!parsedProfile) {
    backUpCorruptProfile(rawValue);

    return { status: "ok", profile: salvageMasterProfile(parsed.data.profile) };
  }

  return { status: "ok", profile: parsedProfile };
}

export function saveMasterProfileToLocalStorage(profile: MasterProfileData) {
  if (!isBrowser()) {
    return;
  }

  const payload: MasterProfileState = {
    updatedAt: new Date().toISOString(),
    profile: normalizeProfile(profile),
  };

  safeSetLocalStorageItem(window.localStorage, MASTER_PROFILE_STORAGE_KEY, JSON.stringify(payload));
}

/**
 * Master profile in, resume out.
 *
 * The projection itself is `projectToResume` in `@veriworkly/profile-core`, shared with the
 * server so a resume created through the API and one created in the studio are the same
 * document. Only the studio-owned pass is added on top: `normalizeResumeData` maps the font
 * id through the studio's catalog, merges the section list, and fills in the two fields a
 * document has and a profile does not (a section's `column`, a customization `theme`).
 */
export function deriveResumeFromMasterProfile(
  resumeId: string,
  profile: MasterProfileData,
): ResumeData {
  return normalizeResumeData(projectToResume(profile, { resumeId }));
}

interface MasterProfileApiRecord {
  profile: {
    id: string;
    userId: string;
    content: unknown;
    createdAt: string;
    updatedAt: string;
  };
  summary: MasterProfileSummaryState | null;
}

interface MasterProfileUpdatedRecord {
  id: string;
  userId: string;
  content: unknown;
  createdAt: string;
  updatedAt: string;
}

function parseSavedMasterProfileResponse(
  value: MasterProfileApiRecord | MasterProfileUpdatedRecord,
  fallbackProfile: MasterProfileData,
) {
  const profileRecord = "profile" in value ? value.profile : value;

  const parsedProfile = toMasterProfileData(profileRecord.content);

  return {
    updatedAt:
      profileRecord.updatedAt ??
      parsedProfile?.updatedAt ??
      fallbackProfile.updatedAt ??
      new Date().toISOString(),
    profile: parsedProfile ?? normalizeProfile(fallbackProfile),
    summary: "summary" in value ? (value.summary ?? null) : null,
  } satisfies MasterProfileBundleState;
}

/**
 * A row that stands for "no profile yet". The server answers 404 for that, but an older
 * server answered with a blank record (`id: ""`, `content: {}`), which fails the schema and
 * would otherwise read as a corrupt profile.
 */
function isPlaceholderRecord(record: MasterProfileApiRecord["profile"]) {
  return record.id === "" || (isRecord(record.content) && Object.keys(record.content).length === 0);
}

export async function loadMasterProfileFromDatabase(): Promise<MasterProfileLoadResult> {
  let profileRecord: MasterProfileApiRecord | null;

  try {
    profileRecord = await fetchApiData<MasterProfileApiRecord | null>("/profiles/master", {
      method: "GET",
      nullOnNotFound: true,
    });
  } catch (error) {
    return { status: "error", error };
  }

  if (!profileRecord?.profile || isPlaceholderRecord(profileRecord.profile)) {
    return { status: "empty" };
  }

  const profile = toMasterProfileData(profileRecord.profile.content);

  if (!profile) {
    return {
      status: "unparseable",
      raw: profileRecord.profile.content,
      updatedAt: profileRecord.profile.updatedAt,
    };
  }

  const bundle = {
    updatedAt: profileRecord.profile.updatedAt ?? profile.updatedAt ?? new Date().toISOString(),
    profile,
    summary: profileRecord.summary ?? null,
  } satisfies MasterProfileBundleState;

  /*
   * Cache through on the way out. Document creation reads local storage synchronously, so
   * without this a user whose profile lives in the database but who has never pressed Save
   * on this device gets an empty document from every resume they create here.
   */
  if (isBrowser()) {
    saveMasterProfileToLocalStorage(bundle.profile);
  }

  return { status: "ok", bundle };
}

export type MasterProfileEditorState =
  | {
      status: "ready";
      profile: MasterProfileData;
      /** The row's cursor for the next save; `null` only when no row exists yet. */
      updatedAt: string | null;
      source: "database" | "local" | "new";
      /** Part of the stored row could not be read; a save replaces it with what is shown. */
      recovered?: true;
    }
  | { status: "error"; error: unknown };

/**
 * What the profile editors open with.
 *
 * Only a confirmed "no profile yet" falls back to this device's cache, and then to an empty
 * profile. A failed load is an error the editor must show with a retry: editing a stand-in
 * and saving it would overwrite a profile that exists but did not load. A row that exists
 * but does not validate opens with whatever is salvageable, the row's real cursor, and
 * `recovered` so the editor can say a save replaces what could not be read.
 */
export async function loadMasterProfileForEditor(): Promise<MasterProfileEditorState> {
  const result = await loadMasterProfileFromDatabase();

  switch (result.status) {
    case "ok":
      return {
        status: "ready",
        profile: result.bundle.profile,
        updatedAt: result.bundle.updatedAt,
        source: "database",
      };

    case "unparseable":
      return {
        status: "ready",
        profile: salvageMasterProfile(result.raw),
        updatedAt: result.updatedAt,
        source: "database",
        recovered: true,
      };

    case "error":
      return { status: "error", error: result.error };

    case "empty": {
      const local = loadMasterProfileFromLocalStorage();

      return local.status === "ok"
        ? { status: "ready", profile: local.profile, updatedAt: null, source: "local" }
        : {
            status: "ready",
            profile: createEmptyStudioMasterProfile(),
            updatedAt: null,
            source: "new",
          };
    }
  }
}

/**
 * The one accessor other features should use. Database first, local cache for every other
 * outcome — offline, unauthenticated, no profile row yet, or a row we cannot read — and an
 * empty profile when the device has none either.
 */
export async function getMasterProfile(): Promise<MasterProfileData> {
  const result = await loadMasterProfileFromDatabase();

  if (result.status === "ok") {
    return result.bundle.profile;
  }

  const local = loadMasterProfileFromLocalStorage();

  return local.status === "ok" ? local.profile : createEmptyStudioMasterProfile();
}

/**
 * The profile a newly created document should be seeded from, or `undefined` when the user
 * has not written one anywhere.
 *
 * Distinct from `getMasterProfile()`, which always answers with *something* because the
 * profile editor has to render a form. When this returns `undefined`, each document type
 * decides its own starting content.
 *
 * A guest has no database profile, and asking for one would be a 401 that signs them out;
 * only the device cache is read for them.
 *
 * Never throws — a document must still be creatable when the network is down.
 */
export async function getMasterProfileForNewDocument(): Promise<MasterProfileData | undefined> {
  try {
    if (useUserStore.getState().isLoggedIn) {
      const result = await loadMasterProfileFromDatabase();

      if (result.status === "ok") {
        return result.bundle.profile;
      }
    }

    const local = loadMasterProfileFromLocalStorage();

    return local.status === "ok" ? local.profile : undefined;
  } catch (error) {
    console.warn("Could not read the master profile; creating the document without it.", error);
    return undefined;
  }
}

/**
 * The profile a reset starts from. A new document may fall back to the device's copy or to
 * blank, but a reset throws away what is there, so a profile that cannot be read stops it
 * with the reason instead of resetting to something else.
 */
export async function getMasterProfileForReset(): Promise<MasterProfileData | undefined> {
  if (!useUserStore.getState().isLoggedIn) {
    const local = loadMasterProfileFromLocalStorage();

    if (local.status === "corrupt") {
      throw new Error("The Master Profile on this device could not be read.");
    }

    return local.status === "ok" ? local.profile : undefined;
  }

  const result = await loadMasterProfileFromDatabase();

  if (result.status === "ok") return result.bundle.profile;
  if (result.status === "empty") return undefined;

  throw new Error(
    result.status === "error" && result.error instanceof Error
      ? `Your Master Profile could not be loaded: ${result.error.message}`
      : "Your Master Profile could not be read.",
  );
}

/**
 * `expectedUpdatedAt` is the `updatedAt` of the row this edit started from, and is required
 * whenever a row exists: without it the server answers 409 rather than overwrite blind.
 * Only the very first save of a profile omits it.
 */
export async function saveMasterProfileToDatabase(
  profile: MasterProfileData,
  expectedUpdatedAt?: string,
) {
  const normalized = normalizeProfile(profile);

  const payload = await fetchApiData<MasterProfileApiRecord | MasterProfileUpdatedRecord>(
    "/profiles/master",
    {
      method: "PUT",
      body: JSON.stringify({ profile: normalized, expectedUpdatedAt }),
    },
  );

  return parseSavedMasterProfileResponse(payload, normalized);
}

/**
 * The cursor that lets the user overwrite after a 409: the server's `currentUpdatedAt`, or a
 * fresh read when the response carried none. `null` when `error` is not a conflict or the
 * stored row cannot be read either.
 */
export async function resolveConflictUpdatedAt(error: unknown): Promise<string | null> {
  if (!(error instanceof ApiRequestError) || error.status !== 409) {
    return null;
  }

  const details = isRecord(error.details) ? error.details : {};

  if (typeof details.currentUpdatedAt === "string") {
    return details.currentUpdatedAt;
  }

  const latest = await loadMasterProfileFromDatabase();

  if (latest.status === "ok") return latest.bundle.updatedAt;
  if (latest.status === "unparseable") return latest.updatedAt;

  return null;
}
