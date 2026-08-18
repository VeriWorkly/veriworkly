import { z } from "zod";

import {
  projectToResume,
  masterProfileSchema,
  normalizeMasterProfile,
  salvageMasterProfile as salvageAgainstBase,
  CURRENT_SCHEMA_VERSION,
  type MasterProfileData,
} from "@veriworkly/profile-core";

import type { ResumeData } from "@/types/resume";

import { fetchApiData } from "@/utils/fetchApiData";

import { MASTER_PROFILE_STORAGE_KEY } from "@/lib/constants";

import { defaultResume } from "@/features/resume/constants/default-resume";
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

export interface MasterProfileBundleState {
  updatedAt: string;
  profile: MasterProfileData;
  summary: MasterProfileSummaryState | null;
}

/**
 * The outcomes of a database load are not interchangeable, and collapsing them all to
 * `null` is what made "your profile did not load" and "you have no profile yet" look
 * identical to every caller — including the one that then quietly served demo data.
 */
export type MasterProfileLoadResult =
  | { status: "ok"; bundle: MasterProfileBundleState }
  | { status: "empty" }
  | { status: "unparseable"; raw: unknown }
  | { status: "error"; error: unknown };

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
 * The studio's base profile: the master-profile-shaped subset of `defaultResume`.
 *
 * Deliberately not the package's `createEmptyMasterProfile()`. That one is genuinely empty,
 * which is right for the server's import shell but wrong here — a user who has never filled
 * in a profile should still get usable starter content in a new resume rather than a blank
 * page. This is why the package's normalisers take the base as an argument.
 */
function getDefaultProfile(): MasterProfileData {
  const profileData = structuredClone(defaultResume) as ResumeData;

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    templateId: profileData.templateId,
    basics: profileData.basics,
    links: profileData.links,
    summary: profileData.summary,
    experience: profileData.experience,
    education: profileData.education,
    projects: profileData.projects,
    skills: profileData.skills,
    languages: [],
    interests: [],
    awards: [],
    certificates: [],
    publications: [],
    volunteer: [],
    references: [],
    achievements: [],
    customSections: profileData.customSections,
    sections: profileData.sections,
    customization: profileData.customization,
    updatedAt: profileData.updatedAt,
  };
}

function defaultState(): MasterProfileState {
  return {
    updatedAt: defaultResume.updatedAt,
    profile: getDefaultProfile(),
  };
}

/**
 * Maps a stored font id onto one the studio can actually render.
 *
 * This used to be a `.transform()` inside the schema. It cannot live there any more: the
 * schema is shared with the server and the portfolio, and neither has any business
 * importing the studio's font catalog. Applying it here keeps the behaviour and keeps the
 * catalog on the side of the boundary that owns it.
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

/** Merges over the studio's base profile, then applies the studio-only font mapping. */
function normalizeProfile(value: Partial<MasterProfileData> | null | undefined) {
  return withNormalizedFont(normalizeMasterProfile(value, getDefaultProfile()));
}

function toMasterProfileData(value: unknown) {
  const parsed = masterProfileSchema.safeParse(value);

  if (!parsed.success) {
    return null;
  }

  return normalizeProfile(parsed.data);
}

/** Field-by-field rescue, against the studio's base rather than an empty profile. */
export function salvageMasterProfile(raw: unknown): MasterProfileData {
  return withNormalizedFont(salvageAgainstBase(raw, getDefaultProfile()));
}

/**
 * Parks the bytes we could not read instead of deleting them.
 *
 * This used to `removeItem` on every parse failure, which is the storage layer destroying
 * the only copy of the user's data at the exact moment it admits it cannot read it. The
 * copy stays recoverable by hand from devtools, and by us if a migration turns out to be
 * what was needed.
 */
function backUpCorruptProfile(rawValue: string) {
  safeSetLocalStorageItem(window.localStorage, MASTER_PROFILE_CORRUPT_KEY, rawValue);

  console.warn(
    `Stored master profile could not be parsed. A copy was kept at "${MASTER_PROFILE_CORRUPT_KEY}".`,
  );
}

export function loadMasterProfileFromLocalStorage(): MasterProfileState {
  if (!isBrowser()) {
    return defaultState();
  }

  const rawValue = window.localStorage.getItem(MASTER_PROFILE_STORAGE_KEY);

  if (!rawValue) {
    return defaultState();
  }

  try {
    const parsed = masterProfileStateSchema.safeParse(JSON.parse(rawValue));

    if (!parsed.success) {
      backUpCorruptProfile(rawValue);
      return defaultState();
    }

    const parsedProfile = toMasterProfileData(parsed.data.profile);

    if (!parsedProfile) {
      backUpCorruptProfile(rawValue);

      return {
        updatedAt: parsed.data.updatedAt ?? defaultResume.updatedAt,
        profile: salvageMasterProfile(parsed.data.profile),
      };
    }

    return {
      updatedAt: parsed.data.updatedAt ?? defaultResume.updatedAt,
      profile: parsedProfile,
    };
  } catch {
    backUpCorruptProfile(rawValue);
    return defaultState();
  }
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

export async function loadMasterProfileFromDatabase(): Promise<MasterProfileLoadResult> {
  let profileRecord: MasterProfileApiRecord;

  try {
    profileRecord = await fetchApiData<MasterProfileApiRecord>("/profiles/master", {
      method: "GET",
    });
  } catch (error) {
    return { status: "error", error };
  }

  if (!profileRecord?.profile) {
    return { status: "empty" };
  }

  const profile = toMasterProfileData(profileRecord.profile.content);

  if (!profile) {
    return { status: "unparseable", raw: profileRecord.profile.content };
  }

  const bundle = {
    updatedAt: profileRecord.profile.updatedAt ?? profile.updatedAt ?? new Date().toISOString(),
    profile,
    summary: profileRecord.summary ?? null,
  } satisfies MasterProfileBundleState;

  /*
   * Cache through on the way out. Document creation reads local storage synchronously, so
   * without this a user whose profile lives in the database but who has never pressed Save
   * on this device gets demo data in every resume they create here.
   */
  if (isBrowser()) {
    saveMasterProfileToLocalStorage(bundle.profile);
  }

  return { status: "ok", bundle };
}

/**
 * The one accessor other features should use. Database first, local cache for every other
 * outcome — offline, unauthenticated, no profile row yet, or a row we cannot read.
 */
export async function getMasterProfile(): Promise<MasterProfileData> {
  const result = await loadMasterProfileFromDatabase();

  if (result.status === "ok") {
    return result.bundle.profile;
  }

  return loadMasterProfileFromLocalStorage().profile;
}

/** Whether this device has ever stored a profile, as opposed to falling back to defaults. */
function hasStoredMasterProfile(): boolean {
  return isBrowser() && window.localStorage.getItem(MASTER_PROFILE_STORAGE_KEY) !== null;
}

/**
 * The profile a newly created document should be seeded from, or `undefined` when the user
 * has not written one anywhere.
 *
 * Distinct from `getMasterProfile()`, which always answers with *something* because the
 * profile editor has to render a form. Seeding needs the sharper question: the studio's
 * fallback is `defaultResume`'s "VeriWorkly User" placeholder content, and handing that to a
 * projection would produce a cover letter addressed from a person who does not exist. When
 * this returns `undefined`, each document type falls back to its own sample content.
 *
 * Never throws — a document must still be creatable when the network is down.
 */
export async function getMasterProfileForNewDocument(): Promise<MasterProfileData | undefined> {
  try {
    const result = await loadMasterProfileFromDatabase();

    if (result.status === "ok") {
      return result.bundle.profile;
    }

    return hasStoredMasterProfile() ? loadMasterProfileFromLocalStorage().profile : undefined;
  } catch (error) {
    console.warn("Could not read the master profile; creating the document from defaults.", error);
    return undefined;
  }
}

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
