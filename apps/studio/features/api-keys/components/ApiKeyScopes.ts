export const AVAILABLE_API_KEY_SCOPES = [
  "user:read",
  "user:write",
  "resume:read",
  "resume:write",
  "roadmap:read",
  "github:read",
  "ai:write",
] as const;

export const API_KEY_SCOPE_OPTIONS = [
  {
    value: "user:read",
    label: "Profile access",
    description: "Read your account profile and identity details.",
  },

  {
    value: "user:write",
    label: "Profile updates",
    description: "Update user-facing profile fields.",
  },

  {
    value: "resume:read",
    label: "Resume read",
    description: "View resume content and metadata.",
  },

  {
    value: "resume:write",
    label: "Resume create/edit",
    description: "Create, edit, delete, sync, and share resume-backed documents.",
  },

  {
    value: "roadmap:read",
    label: "Roadmap read",
    description: "Inspect roadmap items and release planning data.",
  },

  {
    value: "github:read",
    label: "GitHub read",
    description: "Read synced GitHub issue and stats data.",
  },
  {
    value: "ai:write",
    label: "AI generation",
    description: "Generate and rewrite content using the account's AI credits.",
  },
] as const;

export const API_KEY_SCOPE_GROUPS = [
  {
    key: "profile",
    label: "Profile",
    description: "Account identity and display-name APIs.",
    scopes: ["user:read", "user:write"],
  },

  {
    key: "resume",
    label: "Resume",
    description: "Resume document access. Write covers create/edit/delete/share for now.",
    scopes: ["resume:read", "resume:write"],
  },

  {
    key: "roadmap",
    label: "Roadmap",
    description: "Public roadmap APIs are read-only.",
    scopes: ["roadmap:read"],
  },

  {
    key: "github",
    label: "GitHub",
    description: "Synced GitHub stats and issue APIs are read-only.",
    scopes: ["github:read"],
  },
  {
    key: "ai",
    label: "AI",
    description: "AI generation spends credits from the account.",
    scopes: ["ai:write"],
  },
] as const;

export type ApiKeyScopeSummary = {
  label: string;
  access: string;
};

const summarizeApiKeyScopes = (scopes: string[]): ApiKeyScopeSummary[] => {
  const selected = new Set(scopes);

  return API_KEY_SCOPE_GROUPS.flatMap((group) => {
    const [readScope, writeScope] = group.scopes;

    const hasRead = Boolean(readScope && selected.has(readScope));
    const hasWrite = Boolean(writeScope && selected.has(writeScope));

    if (!hasRead && !hasWrite) {
      return [];
    }

    return {
      label: group.label,
      access: hasRead && hasWrite ? "Read / Write" : hasWrite ? "Write" : "Read",
    };
  });
};

export default summarizeApiKeyScopes;
