/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  createEmptyMasterProfile,
  sanitizeImportedPhone,
  sanitizeImportedEmail,
} from "@veriworkly/profile-core";

import { prisma } from "#lib/prisma";
import { config } from "#config";
import { ApiError } from "#lib/errors";
import { logger } from "#lib/logger";
import { masterProfileContentSchema } from "#validators/masterProfileValidator";
import { createAiClient } from "#services/aiClient";
import { getAtsAiPolicy } from "#services/ats/aiPolicy";
import { DocumentService } from "#services/documentService";
import { ProfileService } from "#services/profileService";
import { convertedResumeSchema } from "#services/ats/ai";
import { ProfileImportQuotaService } from "#services/profileImportQuotaService";
import { EntitlementService } from "#services/entitlementService";

function cleanGithubUsername(input: string): string {
  const cleaned = input.trim();
  if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) {
    try {
      const url = new URL(cleaned);
      if (url.hostname.includes("github.com")) {
        const parts = url.pathname.split("/").filter(Boolean);
        if (parts.length > 0) return parts[0];
      }
    } catch {
      // ignore url parse failures
    }
  }
  return cleaned.replace(/[^a-zA-Z0-9-]/g, "");
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
   * Import GitHub profile data and compile into resume format without AI.
   */
  static async importFromGithub(userId: string, usernameOrUrl: string, replaceMaster: boolean) {
    const isPaid =
      (await EntitlementService.has(userId, "ai_credits")) ||
      (await EntitlementService.has(userId, "portfolio_publish"));

    let token: string | undefined = undefined;
    let targetUsername = cleanGithubUsername(usernameOrUrl);

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

      // Validate token and fetch authenticated user's login username
      const meResponse = await fetch("https://api.github.com/user", {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "User-Agent": "VeriWorkly-App",
        },
      });

      if (!meResponse.ok) {
        throw new ApiError(401, "GitHub OAuth token is invalid. Reconnect your account.");
      }

      const meData = await meResponse.json();
      targetUsername = meData.login;
    } else {
      // Paid users can fetch any user profile using the server token
      token = config.github.token || undefined;
    }

    // Enforce rate limits (database backed, once a day for free users)
    await ProfileImportQuotaService.consumeQuota(userId, "github");

    // Fetch user details
    const headers: HeadersInit = {
      Accept: "application/vnd.github+json",
      "User-Agent": "VeriWorkly-App",
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const profileResponse = await fetch(`https://api.github.com/users/${targetUsername}`, {
      headers,
    });
    if (!profileResponse.ok) {
      throw new ApiError(
        profileResponse.status === 404 ? 404 : 502,
        `GitHub profile for "${targetUsername}" not found or API call failed.`,
      );
    }
    const profileData = await profileResponse.json();

    // Fetch repositories
    const reposResponse = await fetch(
      `https://api.github.com/users/${targetUsername}/repos?sort=updated&per_page=30`,
      { headers },
    );
    const reposData = reposResponse.ok ? await reposResponse.json() : [];

    // Map GitHub response directly without AI
    const resumeJson = mapGithubToResumeData(profileData, reposData);

    // Save master profile if requested
    if (replaceMaster) {
      await ProfileService.updateMasterProfile(userId, resumeJson);
    }

    // Create document
    return DocumentService.createDocument(userId, {
      type: "RESUME",
      title: `GitHub Import (${targetUsername})`,
      content: resumeJson,
    });
  }

  /**
   * Import LinkedIn profile from raw copy-pasted text/PDF content (still needs AI).
   */
  static async importFromLinkedin(userId: string, profileText: string, replaceMaster: boolean) {
    // Enforce rate limits (database backed, once a month for free users)
    await ProfileImportQuotaService.consumeQuota(userId, "linkedin");

    const resumeJson = await this.parseTextToResumeSchema(profileText);

    // Save master profile if requested
    if (replaceMaster) {
      await ProfileService.updateMasterProfile(userId, resumeJson);
    }

    // Create document
    return DocumentService.createDocument(userId, {
      type: "RESUME",
      title: "LinkedIn Import",
      content: resumeJson,
    });
  }

  /**
   * Helper using LLM to parse raw text into resume schema structure.
   */
  private static async parseTextToResumeSchema(text: string) {
    const policy = getAtsAiPolicy();
    const model = policy.resumeConversion.model;
    const systemPrompt = policy.prompts.resumeConversion;

    try {
      const completion = await createAiClient().chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: JSON.stringify({
              instruction: "Extract only facts explicitly present and return JSON only.",
              resume: text.trim().slice(0, 50000),
            }),
          },
        ],
        max_tokens: 4000,
        temperature: 0.1,
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content?.trim();
      if (!content) {
        throw new ApiError(502, "The AI provider returned an empty response.");
      }

      const parsed = convertedResumeSchema.parse(JSON.parse(content));
      const mapped = mapParsedToResumeData(parsed);

      /*
       * `convertedResumeSchema` checks the model's own output shape; this checks that what
       * we built from it is a master profile the studio can actually load. The model can
       * return anything — a date as "Jan 2020", a 400-character role — and persisting that
       * used to leave the user with a profile that silently failed to parse on read.
       */
      const validated = masterProfileContentSchema.safeParse(mapped);

      if (!validated.success) {
        logger.warn("AI-parsed profile failed master profile validation", {
          issues: validated.error.issues,
        });

        throw new ApiError(502, "Imported profile data was incomplete. Please try again.");
      }

      return validated.data;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(502, "Failed to parse profile data using AI. Please try again.");
    }
  }
}
