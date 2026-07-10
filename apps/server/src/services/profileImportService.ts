/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "#lib/prisma";
import { config } from "#config";
import { ApiError } from "#lib/errors";
import { createAiClient } from "#services/aiClient";
import { getAtsAiPolicy } from "#services/atsAiPolicy";
import { DocumentService } from "#services/documentService";
import { ProfileService } from "#services/profileService";
import { convertedResumeSchema } from "#services/atsAiService";
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

function sanitizePhone(phone?: string | null): string | undefined {
  if (!phone) return undefined;
  const cleaned = phone.replace(/\D/g, "");
  return cleaned.length === 10 ? cleaned : undefined;
}

function mapGithubToResumeData(profile: any, repos: any[]): any {
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

  return {
    templateId: "executive-clarity",
    basics: {
      fullName: profile.name || profile.login || "GitHub User",
      role: "Software Developer",
      headline: profile.bio || "Software Developer on GitHub",
      email: profile.email || "",
      phone: undefined,
      location: profile.location || "",
      linkEmail: true,
      linkPhone: true,
      linkLocation: true,
    },
    links: {
      displayMode: "icon-username",
      items: linksList,
    },
    summary: profile.bio || "",
    experience: [],
    education: [],
    projects,
    skills,
    languages: [],
    interests: [],
    awards: [],
    certificates: [],
    publications: [],
    volunteer: [],
    references: [],
    achievements: [],
    customSections: [
      {
        id: "certifications-default",
        kind: "certifications",
        title: "Certifications",
        editableTitle: false,
        items: [],
      },
      { id: "awards-default", kind: "awards", title: "Awards", editableTitle: false, items: [] },
      {
        id: "publications-default",
        kind: "publications",
        title: "Publications",
        editableTitle: false,
        items: [],
      },
      {
        id: "languages-default",
        kind: "languages",
        title: "Languages",
        editableTitle: false,
        items: [],
      },
      {
        id: "interests-default",
        kind: "interests",
        title: "Interests",
        editableTitle: false,
        items: [],
      },
      {
        id: "volunteer-default",
        kind: "volunteer",
        title: "Volunteer",
        editableTitle: false,
        items: [],
      },
      {
        id: "references-default",
        kind: "references",
        title: "References",
        editableTitle: false,
        items: [],
      },
      {
        id: "achievements-default",
        kind: "achievements",
        title: "Achievements",
        editableTitle: false,
        items: [],
      },
      {
        id: "custom-default",
        kind: "custom",
        title: "Custom Section",
        editableTitle: true,
        items: [],
      },
    ],
    sections: [
      { id: "basics", label: "Basics", visible: true, order: 0 },
      { id: "links", label: "Links", visible: true, order: 1 },
      { id: "summary", label: "Summary", visible: true, order: 2 },
      { id: "experience", label: "Experience", visible: true, order: 3 },
      { id: "education", label: "Education", visible: true, order: 4 },
      { id: "projects", label: "Projects", visible: true, order: 5 },
      { id: "skills", label: "Skills", visible: true, order: 6 },
      { id: "certifications", label: "Certifications", visible: true, order: 7 },
      { id: "awards", label: "Awards", visible: true, order: 8 },
      { id: "publications", label: "Publications", visible: true, order: 9 },
      { id: "languages", label: "Languages", visible: true, order: 10 },
      { id: "interests", label: "Interests", visible: true, order: 11 },
      { id: "volunteer", label: "Volunteer", visible: true, order: 12 },
      { id: "references", label: "References", visible: true, order: 13 },
      { id: "achievements", label: "Achievements", visible: true, order: 14 },
      { id: "custom", label: "Custom", visible: true, order: 15 },
    ],
    customization: {
      accentColor: "#2563eb",
      textColor: "#0f172a",
      mutedTextColor: "#475569",
      pageBackgroundColor: "#ffffff",
      sectionBackgroundColor: "#ffffff",
      borderColor: "#cbd5e1",
      sectionHeadingColor: "#334155",
      fontFamily: "geist",
      sectionSpacing: 28,
      pagePadding: 32,
      bodyLineHeight: 1.5,
      headingLineHeight: 1.2,
    },
    sync: {
      enabled: false,
      status: "local-only",
      cloudDocumentId: null,
      lastSyncedAt: null,
      revision: 1,
    },
    updatedAt: new Date().toISOString(),
  };
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

  return {
    templateId: "executive-clarity",
    basics: {
      fullName: parsed.basics?.fullName || "Imported User",
      role: parsed.basics?.role || "",
      headline: parsed.basics?.headline || "",
      email: parsed.basics?.email || "",
      phone: sanitizePhone(parsed.basics?.phone),
      location: parsed.basics?.location || "",
      linkEmail: true,
      linkPhone: true,
      linkLocation: true,
    },
    links: {
      displayMode: "icon-username",
      items: links,
    },
    summary: parsed.summary || "",
    experience,
    education,
    projects,
    skills,
    languages: [],
    interests: [],
    awards: [],
    certificates: [],
    publications: [],
    volunteer: [],
    references: [],
    achievements: [],
    customSections: [
      {
        id: "certifications-default",
        kind: "certifications",
        title: "Certifications",
        editableTitle: false,
        items: [],
      },
      { id: "awards-default", kind: "awards", title: "Awards", editableTitle: false, items: [] },
      {
        id: "publications-default",
        kind: "publications",
        title: "Publications",
        editableTitle: false,
        items: [],
      },
      {
        id: "languages-default",
        kind: "languages",
        title: "Languages",
        editableTitle: false,
        items: [],
      },
      {
        id: "interests-default",
        kind: "interests",
        title: "Interests",
        editableTitle: false,
        items: [],
      },
      {
        id: "volunteer-default",
        kind: "volunteer",
        title: "Volunteer",
        editableTitle: false,
        items: [],
      },
      {
        id: "references-default",
        kind: "references",
        title: "References",
        editableTitle: false,
        items: [],
      },
      {
        id: "achievements-default",
        kind: "achievements",
        title: "Achievements",
        editableTitle: false,
        items: [],
      },
      {
        id: "custom-default",
        kind: "custom",
        title: "Custom Section",
        editableTitle: true,
        items: [],
      },
    ],
    sections: [
      { id: "basics", label: "Basics", visible: true, order: 0 },
      { id: "links", label: "Links", visible: true, order: 1 },
      { id: "summary", label: "Summary", visible: true, order: 2 },
      { id: "experience", label: "Experience", visible: true, order: 3 },
      { id: "education", label: "Education", visible: true, order: 4 },
      { id: "projects", label: "Projects", visible: true, order: 5 },
      { id: "skills", label: "Skills", visible: true, order: 6 },
      { id: "certifications", label: "Certifications", visible: true, order: 7 },
      { id: "awards", label: "Awards", visible: true, order: 8 },
      { id: "publications", label: "Publications", visible: true, order: 9 },
      { id: "languages", label: "Languages", visible: true, order: 10 },
      { id: "interests", label: "Interests", visible: true, order: 11 },
      { id: "volunteer", label: "Volunteer", visible: true, order: 12 },
      { id: "references", label: "References", visible: true, order: 13 },
      { id: "achievements", label: "Achievements", visible: true, order: 14 },
      { id: "custom", label: "Custom", visible: true, order: 15 },
    ],
    customization: {
      accentColor: "#2563eb",
      textColor: "#0f172a",
      mutedTextColor: "#475569",
      pageBackgroundColor: "#ffffff",
      sectionBackgroundColor: "#ffffff",
      borderColor: "#cbd5e1",
      sectionHeadingColor: "#334155",
      fontFamily: "geist",
      sectionSpacing: 28,
      pagePadding: 32,
      bodyLineHeight: 1.5,
      headingLineHeight: 1.2,
    },
    sync: {
      enabled: false,
      status: "local-only",
      cloudDocumentId: null,
      lastSyncedAt: null,
      revision: 1,
    },
    updatedAt: new Date().toISOString(),
  };
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
      return mapParsedToResumeData(parsed);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(502, "Failed to parse profile data using AI. Please try again.");
    }
  }
}
