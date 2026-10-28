import { openApiCounts, readOpenApiSpec } from "@/lib/llms";

export const dynamic = "force-static";

/** The agent card, with the API counts taken from the bundled spec at build time (D-015). */
export function GET() {
  const counts = openApiCounts(readOpenApiSpec());

  return Response.json({
    schema_version: "1.0",
    name: "VeriWorkly Technical Documentation Agent Card",
    description:
      "VeriWorkly Technical Documentation (docs.veriworkly.com) is the official documentation platform and interactive API reference for developers and AI agents integrating with VeriWorkly.",
    contact_email: "info@veriworkly.com",
    site_url: "https://docs.veriworkly.com",
    llms_txt: "https://docs.veriworkly.com/llms.txt",
    pricing_md: "https://docs.veriworkly.com/pricing.md",
    openapi_spec: "https://docs.veriworkly.com/openapi.json",
    api: {
      type: "openapi",
      url: "https://docs.veriworkly.com/openapi.json",
      has_user_authentication: true,
      auth_type: "bearer, cookie",
      auth_details:
        "API key sent as 'Authorization: Bearer vw_...' or 'X-API-Key: vw_...', or a Better Auth session cookie for whitelisted first-party origins. Only GET /health and GET /health/ready are open to unauthenticated callers.",
      base_url: "https://api.veriworkly.com/api/v1",
    },
    services: [
      {
        name: "Documentation Portal",
        url: "https://docs.veriworkly.com/docs",
        description:
          "Product guides, architecture deep-dives, operations runbooks, and contribution standards.",
      },
      {
        name: "Interactive API Reference",
        url: "https://docs.veriworkly.com/api-reference",
        description: `Fumadocs-powered interactive API explorer covering all ${counts.operations} operations across ${counts.paths} paths and ${counts.tags} domain tags.`,
      },
      {
        name: "OpenAPI Specification",
        url: "https://docs.veriworkly.com/openapi.json",
        description: `Full single-file OpenAPI 3.1 JSON specification with ${counts.schemas} component schemas.`,
      },
    ],
    capabilities: [
      {
        name: "API Reference Indexing",
        description: `Explore endpoint paths, request parameters, request payloads, and response envelopes for all ${counts.operations} operations across ${counts.paths} paths.`,
        endpoints: [
          "https://api.veriworkly.com/api/v1/health",
          "https://api.veriworkly.com/api/v1/documents",
          "https://api.veriworkly.com/api/v1/profiles/master",
          "https://api.veriworkly.com/api/v1/ats/check",
          "https://api.veriworkly.com/api/v1/ai/generate",
          "https://api.veriworkly.com/api/v1/portfolios/me",
          "https://api.veriworkly.com/api/v1/api-keys",
        ],
      },
      {
        name: "Architecture & Integration Guides",
        description:
          "Index technical guides on the local-first sync engine, the Master Profile data model, the client-side export pipeline, and scoped API keys.",
        endpoints: [
          "https://docs.veriworkly.com/docs/architecture/monorepo",
          "https://docs.veriworkly.com/docs/architecture/state-management",
          "https://docs.veriworkly.com/docs/architecture/resume-schema",
          "https://docs.veriworkly.com/docs/architecture/pdf-generation",
          "https://docs.veriworkly.com/docs/api-keys",
        ],
      },
    ],
    compliance: {
      privacy_policy: "https://veriworkly.com/privacy",
      terms_of_service: "https://veriworkly.com/terms",
    },
    developer: {
      name: "Gautam Raj",
      github: "https://github.com/Gautam25Raj",
    },
  });
}
