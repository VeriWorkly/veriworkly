/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomUUID } from "node:crypto";

import { Prisma } from "@prisma/client";

import type { AtsAiResult, AtsConvertedResume } from "@veriworkly/ats-engine/ai";
import {
  createEmptyMasterProfile,
  sanitizeImportedPhone,
  sanitizeImportedEmail,
} from "@veriworkly/profile-core";

import { prisma } from "#lib/prisma";
import { config } from "#config";
import { ApiError } from "#lib/errors";
import { logger } from "#lib/logger";
import { bumpGeneration } from "#lib/cacheGeneration";
import { cacheNamespaces, userProfileCacheKey } from "#lib/cacheKeys";
import { cacheDel } from "#lib/redis";
import { masterProfileContentSchema } from "#validators/masterProfileValidator";
import { getAtsAiPolicy } from "#services/ats/aiPolicy";
import {
  aiFailure,
  createServerAtsAi,
  runReserved,
  taskRoute,
  type HeldResult,
} from "#services/ats/atsAi";
import { DocumentService } from "#services/documentService";
import { ProfileService } from "#services/profileService";
import { ProfileImportQuotaService } from "#services/profileImportQuotaService";
import { EntitlementService } from "#services/entitlementService";
import { NOT_ENOUGH_CREDITS } from "#services/productNames";
import { githubFailure, githubGet } from "#services/github/requestPath";
import { replayFingerprint, CreditService } from "#services/creditService";

const IMPORT_FAILED = "Failed to parse profile data using AI. Please try again.";
/** The ledger action of a LinkedIn import (also what a replay must match). */
const LINKEDIN_IMPORT_ACTION = "linkedin_import";

/** GitHub's own rule: 1–39 alphanumerics or hyphens, not starting with a hyphen. */
const GITHUB_USERNAME = /^[a-z\d](?:[a-z\d-]{0,38})$/i;

/**
 * A username from either a bare name or a github.com profile URL, or null when the input
 * cannot be one. The URL path segment and bare input are held to the same rule, GitHub's own,
 * before they are interpolated into an API URL (V-144): a URL segment used to be returned
 * verbatim, and bare input was silently stripped of whatever did not fit.
 */
export function parseGithubUsername(input: string): string | null {
  const cleaned = input.trim();
  let candidate = cleaned;

  if (/^https?:\/\//i.test(cleaned)) {
    let url: URL;
    try {
      url = new URL(cleaned);
    } catch {
      return null;
    }

    if (url.hostname !== "github.com" && url.hostname !== "www.github.com") return null;

    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length === 0) return null;

    candidate = parts[0];
  }

  // Anything the old filter would have silently dropped is a rejection now: "octo%20cat" is
  // not a request for "octo20cat", and a name GitHub would refuse is not worth a round trip.
  const sanitised = candidate.replace(/[^a-zA-Z0-9-]/g, "");
  if (sanitised !== candidate) return null;

  return GITHUB_USERNAME.test(candidate) ? candidate : null;
}

/**
 * The import shell: a structurally complete, content-free master profile with only the
 * fields this source actually has data for filled in.
 *
 * The three DEFAULT_* constants and the shell shape used to be hand-copied here from the
 * studio, and keeping them in step was manual. They now come from @veriworkly/profile-core,
 * which is also what `masterProfileContentSchema` validates against — so "the shell is
 * valid content" is true by construction rather than by inspection.
 *
 * Note what is NOT here: a `sync` object. Sync is document state, not profile data, and
 * writing one into the master profile made every later save fail validation.
 */
export function buildResumeShell(fields: {
  basics: Record<string, unknown>;
  links: unknown[];
  summary: string;
  experience?: unknown[];
  education?: unknown[];
  projects: unknown[];
  skills: unknown[];
}): any {
  const empty = createEmptyMasterProfile();

  return {
    ...empty,
    basics: fields.basics,
    links: {
      displayMode: "icon-username",
      items: fields.links,
    },
    summary: fields.summary,
    experience: fields.experience ?? [],
    education: fields.education ?? [],
    projects: fields.projects,
    skills: fields.skills,
  };
}

export function mapGithubToResumeData(profile: any, repos: any[]): any {
  const makeId = (prefix: string, index: number) =>
    `${prefix}-${index}-${Math.random().toString(36).substring(2, 9)}`;

  // Extract skills from repository main languages (unique list)
  const languages = Array.from(
    new Set((repos || []).map((r: any) => r.language).filter(Boolean)),
  ) as string[];

  const skills =
    languages.length > 0
      ? [
          {
            id: makeId("skills", 0),
            name: "Languages & Technologies",
            keywords: languages,
          },
        ]
      : [];

  // Map up to 15 repositories to projects
  const projects = (repos || []).slice(0, 15).map((repo: any, index: number) => ({
    id: makeId("proj", index),
    name: repo.name,
    role: "Creator / Maintainer",
    link: repo.html_url,
    linkLabel: "GitHub Repository",
    showLinkAsText: true,
    summary: repo.description || "No description provided.",
    highlights: [
      `Stars: ${repo.stargazers_count || 0}`,
      `Language: ${repo.language || "Not specified"}`,
    ],
    skills: repo.language ? [repo.language] : [],
  }));

  // Set up basic links
  const linksList = [
    {
      id: makeId("link", 0),
      type: "github",
      label: "GitHub",
      url: profile.html_url,
    },
  ];

  if (profile.blog) {
    const blogUrl = profile.blog.startsWith("http") ? profile.blog : `https://${profile.blog}`;
    linksList.push({
      id: makeId("link", 1),
      type: "custom",
      label: "Website",
      url: blogUrl,
    });
  }

  // GitHub has no phone field at all, so this is always blank. A blank contact field must
  // not be marked linkable — the templates would render a link with nothing behind it.
  const phone = "";
  const email = profile.email || "";
  const location = profile.location || "";

  return buildResumeShell({
    basics: {
      fullName: profile.name || profile.login || "GitHub User",
      role: "Software Developer",
      headline: profile.bio || "Software Developer on GitHub",
      email,
      phone,
      location,
      linkEmail: email !== "",
      linkPhone: phone !== "",
      linkLocation: location !== "",
    },
    links: linksList,
    summary: profile.bio || "",
    projects,
    skills,
  });
}

function mapParsedToResumeData(parsed: any) {
  const makeId = (prefix: string, index: number) =>
    `${prefix}-${index}-${Math.random().toString(36).substring(2, 9)}`;

  const links = (parsed.links || []).map((link: any, index: number) => {
    let type = "custom";
    const url = link.url || "";
    if (url.includes("github.com")) type = "github";
    else if (url.includes("linkedin.com")) type = "linkedin";
    else if (url.includes("twitter.com") || url.includes("x.com")) type = "twitter";
    else if (url.includes("dribbble.com")) type = "dribbble";
    else if (url.includes("behance.net")) type = "behance";
    else if (url.includes("medium.com")) type = "medium";
    else if (url.includes("youtube.com")) type = "youtube";

    return {
      id: makeId("link", index),
      type,
      label: link.label || link.type || type,
      url,
    };
  });

  const experience = (parsed.experience || []).map((exp: any, index: number) => ({
    id: makeId("exp", index),
    company: exp.company || "",
    role: exp.role || "",
    location: exp.location || "",
    startDate: exp.startDate || "",
    endDate: exp.endDate || "",
    current: !!exp.current,
    summary: exp.summary || "",
    highlights: exp.highlights || [],
  }));

  const education = (parsed.education || []).map((edu: any, index: number) => ({
    id: makeId("edu", index),
    school: edu.school || "",
    degree: edu.degree || "",
    field: edu.field || "",
    startDate: edu.startDate || "",
    endDate: edu.endDate || "",
    current: !!edu.current,
    summary: edu.summary || "",
  }));

  const projects = (parsed.projects || []).map((proj: any, index: number) => ({
    id: makeId("proj", index),
    name: proj.name || "",
    role: proj.role || "",
    link: proj.link || "",
    linkLabel: "Link",
    showLinkAsText: true,
    summary: proj.summary || "",
    highlights: proj.highlights || [],
    skills: proj.skills || [],
  }));

  const skills = (parsed.skills || []).map((skill: any, index: number) => ({
    id: makeId("skills", index),
    name: skill.name || "",
    keywords: skill.keywords || [],
  }));

  const phone = sanitizeImportedPhone(parsed.basics?.phone);
  const email = sanitizeImportedEmail(parsed.basics?.email);
  const location = parsed.basics?.location || "";

  return buildResumeShell({
    basics: {
      fullName: parsed.basics?.fullName || "Imported User",
      role: parsed.basics?.role || "",
      headline: parsed.basics?.headline || "",
      email,
      phone,
      location,
      // Same rule as the GitHub path: a blank field must not be marked linkable.
      linkEmail: email !== "",
      linkPhone: phone !== "",
      linkLocation: location !== "",
    },
    links,
    summary: parsed.summary || "",
    experience,
    education,
    projects,
    skills,
  });
}

export class ProfileImportService {
  /**
   * The one place an import writes. Quota consumption, the master-profile replacement and the
   * document insert commit together (V-022): a failure in any of them rolls back the others,
   * so a user is never left with a replaced profile and no document, or a spent quota and
   * nothing to show for it. The free-tier and quota checks that guard the expensive work ran
   * before the fetch/parse; the authoritative ones run again here, inside the transaction.
   */
  private static async commitImport(
    userId: string,
    input: {
      isPaid: boolean;
      provider: "linkedin" | "github";
      title: string;
      content: any;
      replaceMaster: boolean;
    },
  ) {
    const document = await prisma.$transaction(async (tx) => {
      if (!input.isPaid) {
        await ProfileImportQuotaService.consumeFreeQuota(userId, input.provider, tx);
      }

      if (input.replaceMaster) {
        await ProfileService.replaceMasterProfile(userId, input.content, tx);
      }

      const created = await DocumentService.createDocument(
        userId,
        { type: "RESUME", title: input.title, content: input.content },
        tx,
      );

      return created.document;
    });

    // After commit: the list cache and the account read were cleared inside createDocument, but
    // a reader between that clear and the commit could have re-cached the pre-import state; the
    // account page's "Documents" count would then be stale for 30 minutes (V-311).
    await Promise.all([
      bumpGeneration(cacheNamespaces.masterProfile(userId), cacheNamespaces.documentList(userId)),
      cacheDel(userProfileCacheKey(userId)),
    ]);

    return document;
  }

  /**
   * Import GitHub profile data and compile into resume format without AI.
   */
  static async importFromGithub(userId: string, usernameOrUrl: string, replaceMaster: boolean) {
    const requestedUsername = parseGithubUsername(usernameOrUrl);

    if (!requestedUsername) {
      throw new ApiError(400, "Enter a valid GitHub username or profile URL.");
    }

    const isPaid = await EntitlementService.isPaid(userId);

    // Limits first: nothing below runs for a user who could not keep the result.
    await ProfileImportQuotaService.assertQuotaAvailable(userId, "github");
    await DocumentService.assertFreeTierCapacity(userId, "RESUME");

    let token: string | undefined = undefined;
    let targetUsername = requestedUsername;

    if (!isPaid) {
      // Free users can only import their own connected account data
      const account = await prisma.account.findFirst({
        where: { userId, providerId: "github" },
        select: { accessToken: true },
      });

      if (!account || !account.accessToken) {
        throw new ApiError(
          400,
          "Please connect your GitHub account in settings to import your profile.",
        );
      }

      token = account.accessToken;

      // Validate token and fetch authenticated user's login username. A failure here is GitHub's
      // or the link's, never the session's: no 401 (V-240), see `githubFailure`.
      const meResponse = await githubGet("https://api.github.com/user", token);

      if (!meResponse.ok) throw githubFailure(meResponse, true);

      const meData = await meResponse.json();
      targetUsername = meData.login;
    } else {
      // Paid users can fetch any user profile using the server token. The shared API-budget
      // cap counts calls, so it is taken before the calls it protects, whether or not they
      // succeed; the free quota below is consumed only once the import commits.
      token = config.github.token || undefined;
      await ProfileImportQuotaService.consumePaidGithubImportQuota(userId);
    }

    // Fetch user details. Each call has a deadline and a network error is a 502 (V-243).
    const profileResponse = await githubGet(
      `https://api.github.com/users/${targetUsername}`,
      token,
    );
    if (profileResponse.status === 404)
      throw new ApiError(404, `GitHub profile for "${targetUsername}" not found.`);
    if (!profileResponse.ok) throw githubFailure(profileResponse, !isPaid);
    const profileData = await profileResponse.json();

    // Fetch repositories: optional, so any failure imports the profile without them.
    let reposData: any[] = [];
    try {
      const reposResponse = await githubGet(
        `https://api.github.com/users/${targetUsername}/repos?sort=updated&per_page=30`,
        token,
      );
      if (reposResponse.ok) reposData = await reposResponse.json();
    } catch (error) {
      logger.warn("GitHub repositories could not be read; importing the profile without them", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Map GitHub response directly without AI
    const resumeJson = mapGithubToResumeData(profileData, reposData);

    return this.commitImport(userId, {
      isPaid,
      provider: "github",
      title: `GitHub Import (${targetUsername})`,
      content: resumeJson,
      replaceMaster,
    });
  }

  /**
   * Import a LinkedIn profile from raw copy-pasted text/PDF content (still needs AI).
   *
   * Billed like the ATS resume conversion it is (owner decision, 2026-10-26): the same task, the
   * same price, from the one credit pool (owner decision 1). The free import quota applies on top
   * for users without paid access. The credits are reserved before the model is called (a short
   * balance is a 402 and nothing runs), and are charged only once the import has committed: a
   * provider failure, unusable output or a failed write releases them.
   *
   * The same guarantees as the other AI routes (V-239): the caller's `requestId` keys the
   * reservation, and a retry with it after a lost response gets the stored document back
   * (`replayed: true`) before any limit is checked or anything is charged; `signal` ends the
   * provider call at the request deadline or when the client leaves. The controller holds one of
   * the user's AI slots around all of it.
   */
  static async importFromLinkedin(
    userId: string,
    profileText: string,
    replaceMaster: boolean,
    options: { requestId?: string; signal?: AbortSignal } = {},
  ) {
    const fingerprint = replayFingerprint({ profileText, replaceMaster });
    if (options.requestId) {
      const stored = await CreditService.storedResult(
        userId,
        options.requestId,
        LINKEDIN_IMPORT_ACTION,
        fingerprint,
      );
      if (stored && typeof stored === "object" && !Array.isArray(stored))
        return { ...stored, replayed: true };
    }

    const isPaid = await EntitlementService.isPaid(userId);

    // Limits first: the AI call costs money and the quota must not be spent on a 402.
    await ProfileImportQuotaService.assertQuotaAvailable(userId, "linkedin");
    await DocumentService.assertFreeTierCapacity(userId, "RESUME");

    const policy = getAtsAiPolicy();
    const route = policy.resumeConversion;
    const requestId = options.requestId ?? `linkedin-import:${randomUUID()}`;
    // Set once the import has committed; the charge stores it as the reply to a retry.
    let delivered: Prisma.InputJsonValue | null = null;

    let held: HeldResult<AtsConvertedResume>;
    try {
      /*
       * The same task as the ATS resume conversion, and grounded the same way: an identity
       * value the model returns that does not occur in the pasted text — an employer, a school,
       * an email address — is blanked. An empty employer field is visible and fixable in the
       * editor; a fabricated one is not.
       */
      held = await runReserved({
        userId,
        requestId,
        credits: route.credits,
        action: LINKEDIN_IMPORT_ACTION,
        reason: "AI LinkedIn import",
        failure: IMPORT_FAILED,
        ...(options.requestId ? { replay: { fingerprint, response: () => delivered ?? {} } } : {}),
        run: () =>
          createServerAtsAi(requestId).convertResume(
            { resumeText: profileText },
            { ...taskRoute(route, policy.prompts.resumeConversion), signal: options.signal },
          ),
      });
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 402)
        throw new ApiError(402, NOT_ENOUGH_CREDITS);
      if (error instanceof ApiError) throw error;
      // The reservation is already released; a reply that filled nothing is still a failed import.
      throw new ApiError(502, IMPORT_FAILED);
    }

    let document;
    try {
      document = await this.commitImport(userId, {
        isPaid,
        provider: "linkedin",
        title: "LinkedIn Import",
        content: this.toMasterProfile(held.outcome),
        replaceMaster,
      });
    } catch (error) {
      await held.release();
      throw error;
    }

    delivered = JSON.parse(JSON.stringify(document)) as Prisma.InputJsonValue;

    try {
      await held.commit();
    } catch {
      // The import is committed and delivered; `commit` released the reservation and logged
      // why it could not be charged. Failing the request now would only invite a duplicate.
    }

    return document;
  }

  /**
   * The model's conversion as a master profile the studio can load, or a 502.
   *
   * The task checks the model's own output shape; this checks that what we built from it is a
   * master profile the studio can actually load. The model can return anything — a date as
   * "Jan 2020", a 400-character role — and persisting that used to leave the user with a profile
   * that silently failed to parse on read.
   */
  private static toMasterProfile(outcome: AtsAiResult<AtsConvertedResume>) {
    if (outcome.rejected.length) {
      logger.warn("AI profile import returned ungrounded values", {
        rejectedValues: outcome.rejected.length,
        paths: outcome.rejected.map((violation) => violation.path).slice(0, 20),
      });
    }

    let mapped: unknown;
    try {
      mapped = mapParsedToResumeData(outcome.result);
    } catch (error) {
      logger.error("AI profile import failed", aiFailure(error));
      throw new ApiError(502, IMPORT_FAILED);
    }

    const validated = masterProfileContentSchema.safeParse(mapped);

    if (!validated.success) {
      logger.warn("AI-parsed profile failed master profile validation", {
        issues: validated.error.issues,
      });

      throw new ApiError(502, "Imported profile data was incomplete. Please try again.");
    }

    return validated.data;
  }
}
