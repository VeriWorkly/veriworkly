import type { z } from "zod";

import { clickSchema, referralCodeSchema, withdrawalSchema } from "#validators/affiliateValidator";
import { aiGenerateSchema } from "#validators/aiValidator";
import { ambassadorApplicationSchema } from "#validators/ambassadorValidator";
import { apiKeyCreateSchema, apiKeyRotateSchema } from "#validators/apiKeyValidator";
import { atsAnalyzeSchema, atsCheckSchema, atsConvertResumeSchema } from "#validators/atsValidator";
import {
  checkoutSchema,
  creditPackCheckoutSchema,
  planChangeSchema,
} from "#validators/billingValidator";
import { changelogQuerySchema } from "#validators/changelogValidator";
import {
  documentCreateSchema,
  documentListQuerySchema,
  documentUpdateSchema,
} from "#validators/documentValidator";
import { githubQuerySchema } from "#validators/githubValidator";
import { masterProfilePayloadSchema } from "#validators/masterProfileValidator";
import {
  portfolioAssetCompleteSchema,
  portfolioAssetUploadSchema,
} from "#validators/portfolioAssetValidator";
import {
  portfolioPublishSchema,
  portfolioSaveDraftSchema,
  portfolioSubdomainParamsSchema,
  portfolioViewBeaconSchema,
  publicPortfolioListQuerySchema,
} from "#validators/portfolioValidator";
import { importGithubSchema, importLinkedinSchema } from "#validators/profileImportValidator";
import { roadmapQuerySchema } from "#validators/roadmapValidator";
import { usageMetricEventSchema } from "#validators/statsValidator";
import {
  publicReadableParamsSchema,
  sharedDocumentIdsQuerySchema,
  shareLinkCreateSchema,
  shareLinkPasswordSchema,
} from "#validators/shareValidator";
import {
  updateAutoSyncSchema,
  updateUserNameSchema,
  updateUsernameSchema,
  usernameAvailabilityParamsSchema,
} from "#validators/userValidator";

/**
 * Which zod schema validates each part of each public request (IMPROVEMENTS 14).
 *
 * `npm run generate:openapi` turns these into JSON Schema and writes
 * `apps/docs-platform/specs/generated/requests.json`; the docs build merges that file into the
 * hand-written spec, so request shapes come from the code the controllers run, while summaries,
 * descriptions, examples and responses stay hand-written.
 *
 * Keys are `METHOD path` exactly as in `apps/docs-platform/specs/paths/*.yaml`. Every route here
 * must exist in the spec, and every documented operation with query parameters or a JSON body
 * must be here or in `HAND_WRITTEN_REQUESTS`; the docs build fails otherwise.
 */
export type OperationRequestSchemas = {
  params?: z.ZodType;
  query?: z.ZodType;
  body?: z.ZodType;
  /**
   * Request fields the controller reads outside these schemas. The spec keeps their hand-written
   * docs; any other documented field the schema does not have fails the docs build.
   */
  readOutsideSchema?: { query?: string[]; body?: string[] };
};

export const OPENAPI_REQUEST_REGISTRY: Record<string, OperationRequestSchemas> = {
  "PUT /api/v1/users/me/name": { body: updateUserNameSchema },
  "PUT /api/v1/users/me/username": { body: updateUsernameSchema },
  "PUT /api/v1/users/me/sync": { body: updateAutoSyncSchema },
  "GET /api/v1/users/{username}/availability": { params: usernameAvailabilityParamsSchema },

  "GET /api/v1/roadmap": { query: roadmapQuerySchema },
  "GET /api/v1/changelog": { query: changelogQuerySchema },
  "GET /api/v1/github/issues": { query: githubQuerySchema },

  "POST /api/v1/api-keys": {
    body: apiKeyCreateSchema,
    readOutsideSchema: { body: ["scopes", "rateLimit"] },
  },
  "POST /api/v1/api-keys/{id}/rotate": {
    body: apiKeyRotateSchema,
    readOutsideSchema: { body: ["scopes", "rateLimit"] },
  },

  "PUT /api/v1/profiles/master": { body: masterProfilePayloadSchema },
  "POST /api/v1/profiles/import/github": { body: importGithubSchema },
  "POST /api/v1/profiles/import/linkedin": { body: importLinkedinSchema },

  "GET /api/v1/documents": { query: documentListQuerySchema },
  "POST /api/v1/documents": { body: documentCreateSchema },
  "PATCH /api/v1/documents/{id}": { body: documentUpdateSchema },

  "POST /api/v1/ats/check": { body: atsCheckSchema },
  "POST /api/v1/ats/analyze": { body: atsAnalyzeSchema },
  "POST /api/v1/ats/convert-resume": { body: atsConvertResumeSchema },
  "POST /api/v1/ai/generate": { body: aiGenerateSchema },

  "GET /api/v1/portfolios/public": { query: publicPortfolioListQuerySchema },
  "POST /api/v1/portfolios/public/{subdomain}/view": { body: portfolioViewBeaconSchema },
  "PUT /api/v1/portfolios/draft": { body: portfolioSaveDraftSchema },
  "GET /api/v1/portfolios/subdomains/{slug}/availability": {
    params: portfolioSubdomainParamsSchema,
  },
  "POST /api/v1/portfolios/publish": { body: portfolioPublishSchema },
  "POST /api/v1/portfolio-assets/upload-url": { body: portfolioAssetUploadSchema },
  "POST /api/v1/portfolio-assets/complete": { body: portfolioAssetCompleteSchema },

  "POST /api/v1/billing/checkout": { body: checkoutSchema },
  "POST /api/v1/billing/credits/checkout": { body: creditPackCheckoutSchema },
  "POST /api/v1/billing/subscription/change-plan/preview": {
    body: planChangeSchema.omit({ idempotencyKey: true }),
  },
  "POST /api/v1/billing/subscription/change-plan": { body: planChangeSchema },

  "POST /api/v1/stats/events": { body: usageMetricEventSchema },

  "POST /api/v1/shares": { body: shareLinkCreateSchema },
  "GET /api/v1/shares/documents/shared-ids": { query: sharedDocumentIdsQuerySchema },
  "GET /api/v1/shares/public/{username}/{slug}": { params: publicReadableParamsSchema },
  "POST /api/v1/shares/public/{username}/{slug}/verify": {
    params: publicReadableParamsSchema,
    body: shareLinkPasswordSchema,
  },

  "POST /api/v1/affiliates/click": { body: clickSchema },
  "POST /api/v1/affiliates/referral": { body: referralCodeSchema },
  "POST /api/v1/affiliates/withdrawals": { body: withdrawalSchema },
  "POST /api/v1/ambassador/apply": { body: ambassadorApplicationSchema },
};

/**
 * Documented operations whose query or JSON body is not validated by zod, so the spec stays
 * hand-written for them. Path parameters read raw (`req.params.id`) need no entry.
 */
export const HAND_WRITTEN_REQUESTS: Record<string, string> = {
  "GET /api/v1/api-keys": "page/limit/offset are read leniently by parseOffsetPagination",
  "GET /api/v1/shares/documents/{documentId}":
    "page/limit/offset are read leniently by parseOffsetPagination",
  "GET /api/v1/affiliates/leaderboard": "period: anything but all_time means monthly",
  "POST /api/v1/auth/email-otp/send-verification-otp": "Better Auth endpoint",
  "POST /api/v1/auth/sign-in/email-otp": "Better Auth endpoint",
  "DELETE /api/v1/users/me":
    "confirmAffiliateForfeit and confirmedAffiliateForfeitCents are read leniently by the controller",
};
