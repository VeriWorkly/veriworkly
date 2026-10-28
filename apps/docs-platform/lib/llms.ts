import fs from "node:fs";
import path from "node:path";

const METHODS = ["get", "put", "post", "patch", "delete", "head", "options"] as const;

type Operation = { operationId?: string; summary?: string; tags?: string[] };

export type OpenApiSpec = {
  paths: Record<string, Partial<Record<(typeof METHODS)[number], Operation>>>;
  components?: { schemas?: Record<string, unknown> };
  tags?: { name: string }[];
};

/** The bundled spec `generate-api-docs.mjs` writes; the same file `/openapi.json` serves. */
export function readOpenApiSpec(appRoot = process.cwd()): OpenApiSpec {
  return JSON.parse(fs.readFileSync(path.join(appRoot, "public", "openapi.json"), "utf8"));
}

export function openApiOperations(spec: OpenApiSpec) {
  return Object.entries(spec.paths).flatMap(([route, item]) =>
    METHODS.flatMap((method) => {
      const operation = item[method];
      return operation ? [{ method: method.toUpperCase(), route, ...operation }] : [];
    }),
  );
}

export function openApiCounts(spec: OpenApiSpec) {
  return {
    paths: Object.keys(spec.paths).length,
    operations: openApiOperations(spec).length,
    schemas: Object.keys(spec.components?.schemas ?? {}).length,
    tags: spec.tags?.length ?? 0,
  };
}

type TreeNode =
  | { type: "page"; url: string }
  | { type: "separator"; name?: unknown }
  | { type: "folder"; name?: unknown; index?: { url: string }; children: TreeNode[] };

export type LlmsPage = {
  url: string;
  data: { title: string; description?: string; _openapi?: unknown };
};

export type LlmsSection = { heading?: string; pages: LlmsPage[] };

/**
 * The tree's pages in sidebar order, grouped under its separators. Names come from the pages, not
 * the tree: the API tree's names are React elements carrying the method badge.
 */
export function sectionsInSidebarOrder(
  tree: { children: TreeNode[] },
  pages: LlmsPage[],
): LlmsSection[] {
  const byUrl = new Map(pages.map((page) => [page.url, page]));
  const sections: LlmsSection[] = [{ pages: [] }];
  const seen = new Set<string>();

  const add = (url: string, folder?: string) => {
    const page = byUrl.get(url);
    if (!page || seen.has(url)) return;
    seen.add(url);
    // Every API folder has a page titled "Overview"; the folder says which one.
    const title = folder && page.data.title === "Overview" ? `${folder} overview` : page.data.title;
    sections.at(-1)!.pages.push({ ...page, data: { ...page.data, title } });
  };

  const walk = (nodes: TreeNode[], folder?: string) => {
    for (const node of nodes) {
      if (node.type === "separator") {
        sections.push({
          heading: typeof node.name === "string" ? node.name : undefined,
          pages: [],
        });
      } else if (node.type === "folder") {
        const name = typeof node.name === "string" ? node.name : folder;
        if (node.index) add(node.index.url, name);
        walk(node.children, name);
      } else {
        add(node.url, folder);
      }
    }
  };

  walk(tree.children);

  // A page the sidebar does not list still belongs in the index.
  const rest = pages.filter((page) => !seen.has(page.url));
  if (rest.length) sections.push({ heading: "Other pages", pages: rest });

  return sections.filter((section) => section.pages.length > 0);
}

/** One line of prose: generated descriptions span several lines and carry Markdown emphasis. */
function oneLine(text: string | undefined) {
  return (text ?? "").replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
}

function pageLine(siteUrl: string, page: LlmsPage) {
  const description = oneLine(page.data.description);
  return `- [${page.data.title}](${siteUrl}${page.url})${description ? `: ${description}` : ""}`;
}

function sectionsMarkdown(siteUrl: string, sections: LlmsSection[]) {
  return sections
    .map((section) =>
      [
        section.heading ? `### ${section.heading}\n` : "",
        ...section.pages.map((p) => pageLine(siteUrl, p)),
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");
}

/** Every operation, grouped by its spec tag, each linked to its generated page. */
export function apiDirectory(siteUrl: string, spec: OpenApiSpec, apiPages: LlmsPage[]) {
  const pageByOperation = new Map(apiPages.map((page) => [page.url.split("/").at(-1)!, page]));
  const byTag = new Map<string, string[]>((spec.tags ?? []).map((tag) => [tag.name, []]));

  for (const operation of openApiOperations(spec)) {
    const tag = operation.tags?.[0] ?? "Other";
    const page = operation.operationId ? pageByOperation.get(operation.operationId) : undefined;
    const label = `\`${operation.method} ${operation.route.replace(/^\/api\/v1/, "")}\``;
    if (!byTag.has(tag)) byTag.set(tag, []);
    byTag.get(tag)!.push(page ? `[${label}](${siteUrl}${page.url})` : label);
  }

  return [...byTag]
    .filter(([, operations]) => operations.length > 0)
    .map(([tag, operations]) => `- **${tag}**: ${operations.join(", ")}`)
    .join("\n");
}

type IndexInput = {
  siteUrl: string;
  spec: OpenApiSpec;
  docs: LlmsSection[];
  engine: LlmsSection[];
  api: LlmsSection[];
  apiPages: LlmsPage[];
};

/** The llmstxt.org index of all three trees, with the API counts taken from the bundled spec. */
export function buildLlmsIndex({ siteUrl, spec, docs, engine, api, apiPages }: IndexInput) {
  const counts = openApiCounts(spec);
  const guides = api
    .map((section) => ({ ...section, pages: section.pages.filter((page) => !page.data._openapi) }))
    .filter((section) => section.pages.length > 0);

  return `# VeriWorkly Documentation & API Reference
> Technical documentation, architecture guides, and interactive API reference for VeriWorkly, the privacy-first career workspace.

## Documentation Overview
VeriWorkly Docs (\`docs.veriworkly.com\`) is the single source of truth for developer integrations, system architecture, data models, and API specifications.

Three content trees:
- \`/docs\`: hand-written product, architecture, operations, and contribution guides.
- \`/ats-engine\`: the open-source VeriWorkly ATS Engine (\`@veriworkly/ats-engine\`): install, guides, CLI, GitHub Action, MCP server, and a reference generated from the installed package. Its own index: \`${siteUrl}/ats-engine/llms.txt\`; every page as Markdown: \`${siteUrl}/ats-engine/llms-full.txt\`.
- \`/api-reference\`: generated from the OpenAPI specification; never edited by hand.

## Machine-Readable Resources
- **Every page as Markdown**: \`${siteUrl}/llms-full.txt\`
- **Agent Card**: \`${siteUrl}/.well-known/agent.json\`
- **OpenAPI 3.1 Spec (JSON)**: \`${siteUrl}/openapi.json\`
- **OpenAPI 3.1 Spec (YAML)**: \`${siteUrl}/openapi.yaml\`
- **Interactive API Reference**: \`${siteUrl}/api-reference\`
- **Pricing**: \`${siteUrl}/pricing.md\`

## API Authentication & Response Specifications

Base URL: \`https://api.veriworkly.com/api/v1\` (local development: \`http://localhost:8080/api/v1\`).

### Authentication Schemes
1. **API Keys** (\`vw_\` prefix + 64 hex characters): send via \`X-API-Key: vw_...\` or \`Authorization: Bearer vw_...\`. Both headers are accepted.
   - *Rate limit*: 20 requests per 15-minute window per key by default, configurable per key up to 600.
   - *Allowed scopes*: \`user:read\`, \`user:write\`, \`resume:read\`, \`resume:write\`, \`roadmap:read\`, \`changelog:read\`, \`github:read\`, \`ai:write\`. A key missing a route's required scope receives \`403\`.
2. **Session Cookies**: Better Auth HTTP-only cookie, named \`veriworkly-auth.session_token\` locally and \`__Secure-veriworkly-auth.session_token\` in production. Honoured only for whitelisted first-party origins.

Only \`GET /health\` and \`GET /health/ready\` are open to unauthenticated callers. Endpoints described as "public" (public portfolios, public share links, roadmap, changelog, GitHub stats) need no logged-in user but still require an API key or a whitelisted first-party origin, and return \`401\` without one.

### Standard Response Envelope
Every \`/api/v1\` endpoint returns a standardized JSON envelope:
- **Success**: \`{ "success": true, "message": "...", "data": { ... } }\`
- **Error**: \`{ "success": false, "message": "...", "statusCode": 4xx|5xx, "details": [ ... ] }\`; \`details\` is present only for validation errors.

Endpoints under \`/api/v1/auth/*\` are served by Better Auth and return **its** payload shapes, not this envelope.

### Pagination
List endpoints use offset pagination. Page size defaults to 20 and is capped at 50, addressable as either \`limit\`/\`offset\` or \`page\`/\`pageSize\`; responses echo both alongside \`total\`, \`totalPages\`, \`hasMore\`, and a \`pagination\` block. \`nextCursor\` is always \`null\`.

## API Directory (${counts.paths} paths, ${counts.operations} operations, ${counts.schemas} schemas, ${counts.tags} tags)
${apiDirectory(siteUrl, spec, apiPages)}

Not part of this reference: \`/api/v1/admin/*\` (admin console), \`/api/v1/stats/admin/*\` (admin telemetry dashboard), and \`/api/v1/contact\` (contact form intake) are internal surfaces.

## API Reference Guides
${sectionsMarkdown(siteUrl, guides)}

## Docs
${sectionsMarkdown(siteUrl, docs)}

## ATS Engine
${sectionsMarkdown(siteUrl, engine)}

## Key Product Facts
- Documents are stored in the browser's \`localStorage\` first. Cloud sync requires an account and is opt-in per account and per document.
- All six export formats (PDF, DOCX, HTML, Markdown, plain text, JSON) are generated client-side. There is no headless browser and no server-side render step.
- Seven resume templates and five cover letter templates, all free. The four portfolio templates live in a private submodule; two of them are premium.
- Payments run through Dodo Payments. VeriWorkly does not use Stripe.
- The application code is MIT-licensed: \`https://github.com/VeriWorkly/veriworkly\`
`;
}

/** The method and path of an operation page: its MDX body is only the playground component. */
export function findOperation(
  spec: OpenApiSpec,
  operationId: string,
): { method: string; route: string } | undefined {
  const operation = openApiOperations(spec).find((op) => op.operationId === operationId);
  return operation && { method: operation.method, route: operation.route };
}
