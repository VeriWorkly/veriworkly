import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";

import { config } from "#config";
import { BILLING_SUSPENSION_REASONS, BillingService } from "#services/billingService";
import { EntitlementService } from "#services/entitlementService";
import { enforcedEntitlement } from "#services/entitlementEnforcement";
import {
  PortfolioAssetService,
  hasUnownedImageSlot,
  referencedAssetIds,
  withStoredAssetUrls,
  USER_UNPUBLISHED_REASON,
} from "#services/portfolioAssetService";
import { ENTITLEMENT_KEYS } from "#services/productCatalog";
import { notifyOnce } from "#services/billingNotifications";
import { UNLOCK_PHRASES } from "#services/productNames";

import {
  invalidatePublicPortfolioCaches,
  publicPortfolioCacheKey,
  publicPortfolioListCacheKey,
  revalidatePublicPortfolios,
} from "#utils/portfolioPublicationCache";

import { prisma } from "#lib/prisma";
import { VIEW_ROLLUP_DATE } from "#lib/portfolioViewRollup";
import { logger } from "#lib/logger";
import { ApiError, handleValidationError } from "#lib/errors";
import {
  buildUniqueSlugHelper,
  normalizePortfolioSubdomain,
  portfolioSubdomainLookupKey,
  RESERVED_SUBDOMAINS,
} from "#utils/slugs";
import { cacheGet, cacheSet, cacheDel, getRedis } from "#lib/redis";
import { acquireJobLock } from "#lib/jobLock";
import { bumpGeneration, singleFlight } from "#lib/cacheGeneration";
import { cacheNamespaces, documentCacheNamespaces, userProfileCacheKey } from "#lib/cacheKeys";
import { hashForAnalytics } from "#utils/analyticsHash";
import { sendPortfolioUpdatedEmail } from "#services/mail/portfolioMail";

import {
  isPremiumPortfolioTemplate,
  PREMIUM_PORTFOLIO_TEMPLATE_IDS,
  portfolioContentSchema,
  type PortfolioContentInput,
} from "#validators/portfolioValidator";

/** The paid portfolio features, each checked below (V-142; see `entitlementEnforcement`). */
const PORTFOLIO_PUBLISH = enforcedEntitlement(
  ENTITLEMENT_KEYS.PORTFOLIO_PUBLISH,
  "PortfolioService.publish (premium templates), getPublicPortfolio (premium rendering)",
);
const WATERMARK_REMOVAL = enforcedEntitlement(
  ENTITLEMENT_KEYS.WATERMARK_REMOVAL,
  "PortfolioService.publish (badge)",
);
const SEO_CONTROLS = enforcedEntitlement(
  ENTITLEMENT_KEYS.SEO_CONTROLS,
  "PortfolioService.publish (SEO block)",
);
const ANALYTICS = enforcedEntitlement(ENTITLEMENT_KEYS.ANALYTICS, "PortfolioService.getAnalytics");

const VIEW_BUFFER_TTL_SECONDS = 14 * 24 * 60 * 60;
const MAX_VIEW_BUFFER_FIELDS = 10_000;
// A vanity metric doesn't need per-request precision, but trivially repeatable POSTs shouldn't be
// able to inflate it either — collapse repeat views from the same viewer within this window.
const VIEW_DEDUP_WINDOW_SECONDS = 30 * 60;
/** Above the flush's whole budget (one INSERT under the 30 s statement timeout, plus Redis). */
const VIEW_FLUSH_LOCK_SECONDS = 300;

/**
 * V-114: one round trip, and the cap check cannot race. KEYS: buffer, pending, dedup (or "").
 * ARGV: field, fallback field, cap, date key, buffer TTL, dedup TTL. Returns 0 for a repeat view.
 */
const BUFFER_PORTFOLIO_VIEW_SCRIPT = `
  if KEYS[3] ~= "" and not redis.call("SET", KEYS[3], "1", "NX", "EX", ARGV[6]) then
    return 0
  end
  local field = ARGV[1]
  if redis.call("HEXISTS", KEYS[1], field) == 0 and redis.call("HLEN", KEYS[1]) >= tonumber(ARGV[3]) then
    field = ARGV[2]
  end
  redis.call("HINCRBY", KEYS[1], field, 1)
  redis.call("HINCRBY", KEYS[2], ARGV[4], 1)
  redis.call("EXPIRE", KEYS[1], ARGV[5])
  redis.call("EXPIRE", KEYS[2], ARGV[5])
  return 1
`;

/**
 * Takes a flushed day's counts off each publication's pending hash (V-113) and marks the batch
 * adjusted, in one step. A field that reaches zero is deleted: decremented and left in place, an
 * active portfolio gained one field per day forever. KEYS: the adjusted marker, then one pending
 * hash per count in ARGV[2..].
 */
const SETTLE_PENDING_VIEWS_SCRIPT = `
  if redis.call("EXISTS", KEYS[1]) == 1 then
    return 0
  end
  for i = 2, #KEYS do
    if redis.call("HINCRBY", KEYS[i], ARGV[1], -tonumber(ARGV[i])) <= 0 then
      redis.call("HDEL", KEYS[i], ARGV[1])
    end
  end
  redis.call("SET", KEYS[1], "1")
  return 1
`;

/** How long the view beacon trusts a subdomain → publication id lookup (V-052). */
const VIEW_TARGET_TTL_SECONDS = 60;

// One page without a `limit`: the sitemap pages through with `offset` (V-310), and the bound keeps
// one unparameterised GET from streaming the table.
const PUBLIC_LIST_MAX = 1000;

/**
 * `suspensionReason` values that make a suspension sticky. An admin takedown is stored as
 * `moderation:<free text>`; `user_unpublished` is the user's own takedown and billing's own
 * reasons are listed in `BILLING_SUSPENSION_REASONS`. Anything else on a SUSPENDED row is
 * treated as moderation too, so an unknown reason fails closed. A locked row is left alone by
 * the user's Publish/Unpublish and by billing; only an admin lifts it, by setting the status back
 * to LIVE (`adminPortfolioService.updatePublicationStatus`) or by unlisting the document
 * (`adminDocumentService.updateDocumentVisibility`, which leaves it as the owner's own unpublish).
 */
export const MODERATION_SUSPENSION_PREFIX = "moderation:";

const MODERATED_MESSAGE = "This portfolio was taken down by a moderator.";

export function isModerationLocked(publication: {
  status: string;
  suspensionReason: string | null;
}) {
  if (publication.status !== "SUSPENDED") return false;

  const reason = publication.suspensionReason;

  return (
    reason !== null &&
    reason !== USER_UNPUBLISHED_REASON &&
    !(BILLING_SUSPENSION_REASONS as readonly string[]).includes(reason)
  );
}

/**
 * The `reasonBeforeModeration` a moderation lock records as it goes on (V-285): the owner's or
 * billing's own suspension reason it covers, or null when the site was online. A row already
 * under a lock keeps what its first lock recorded, so this returns `{}` for it.
 */
export function rememberReasonBeforeModeration(publication: {
  status: string;
  suspensionReason: string | null;
}): { reasonBeforeModeration?: string | null } {
  if (isModerationLocked(publication)) return {};

  return {
    reasonBeforeModeration:
      publication.status === "SUSPENDED" ? publication.suspensionReason : null,
  };
}

/**
 * The owner's own unpublish (or trashing the document) while a moderator's lock is on: the lock
 * and its reason stay, and the owner's choice is what the lift returns the site to (V-285).
 * A no-op on a row with no lock, so callers run it beside their ordinary unpublish write.
 */
export function recordOwnerUnpublishUnderLock(
  tx: Prisma.TransactionClient,
  where: Prisma.PortfolioPublicationWhereInput,
) {
  return tx.portfolioPublication.updateMany({
    where: {
      AND: [
        where,
        { status: "SUSPENDED", suspensionReason: { startsWith: MODERATION_SUSPENSION_PREFIX } },
      ],
    },
    data: { reasonBeforeModeration: USER_UNPUBLISHED_REASON },
  });
}

/**
 * `isModerationLocked` as a write condition: a publication the caller may still change. Every
 * owner write (publish, unpublish, delete) and the admin takedown use it in a conditional
 * `updateMany`, so a takedown that commits after their read is never overwritten (V-226). A
 * SUSPENDED row with no reason counts as locked, as above.
 */
export const NOT_MODERATION_LOCKED = {
  OR: [
    { status: { not: "SUSPENDED" as const } },
    { suspensionReason: { in: [USER_UNPUBLISHED_REASON, ...BILLING_SUSPENSION_REASONS] } },
  ],
} satisfies Prisma.PortfolioPublicationWhereInput;

/** Owner-facing: `keep` lists the names this user already holds (see `ownedSubdomains`). */
function normalizeSubdomain(value: string, keep: Iterable<string> = []) {
  const subdomain = normalizePortfolioSubdomain(value, keep);

  if (!subdomain) throw new ApiError(400, "Choose a valid portfolio subdomain.");

  return subdomain;
}

/**
 * The subdomain a user already holds: their publication's. Re-saving or re-publishing it skips
 * the new-name rules (reserved list, punycode, trailing dash), so a site published before a name
 * was reserved keeps working for its owner. A draft's `Document.slug` is NOT a held name (V-300):
 * any client can set a PORTFOLIO document's slug through the generic document routes, which made
 * `login`, `billing`, `admin`... claimable.
 */
async function ownedSubdomains(userId: string) {
  const publication = await prisma.portfolioPublication.findUnique({
    where: { userId },
    select: { subdomain: true },
  });

  return publication ? [publication.subdomain] : [];
}

const PORTFOLIO_DRAFT_TITLE = "Portfolio";

/**
 * What the draft routes return. `slug` is the draft's subdomain, as the portfolio editor has
 * always read it (V-301 moved it to `portfolioSubdomain`); a PORTFOLIO document made through the
 * generic document routes and never saved as a draft has none yet, and shows its document slug.
 */
const DRAFT_SELECT = {
  id: true,
  slug: true,
  portfolioSubdomain: true,
  templateId: true,
  content: true,
  revision: true,
  updatedAt: true,
} satisfies Prisma.DocumentSelect;

function draftView({
  portfolioSubdomain,
  ...draft
}: Prisma.DocumentGetPayload<{ select: typeof DRAFT_SELECT }>) {
  return { ...draft, slug: portfolioSubdomain ?? draft.slug };
}

/**
 * A first draft's document row. Its slug is checked free first; another document taking it
 * before the insert (P2002 on `[userId, slug]`) is retried with a random suffix, rather than
 * answered as a conflict the user cannot act on.
 */
async function createDraftDocument(
  userId: string,
  data: Pick<Prisma.DocumentUncheckedCreateInput, "portfolioSubdomain" | "content" | "templateId">,
) {
  for (let attempt = 0; ; attempt += 1) {
    const slug =
      attempt === 0
        ? await freeDocumentSlug(userId, PORTFOLIO_DRAFT_TITLE)
        : `portfolio-${randomUUID().slice(0, 8)}`;
    try {
      return await prisma.document.create({
        data: {
          ...data,
          userId,
          type: "PORTFOLIO",
          title: PORTFOLIO_DRAFT_TITLE,
          slug,
          visibility: "PRIVATE",
          lastSyncedAt: new Date(),
        },
        select: DRAFT_SELECT,
      });
    } catch (error) {
      const slugTaken =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
      if (!slugTaken || attempt >= 2) throw error;
    }
  }
}

/** A document slug this user does not hold yet (any type, trashed ones included). */
function freeDocumentSlug(userId: string, title: string) {
  return buildUniqueSlugHelper(
    title,
    async (candidate) =>
      RESERVED_SUBDOMAINS.has(candidate) ||
      (await prisma.document.count({ where: { userId, slug: candidate } })) > 0,
  );
}

/** The subscription products that carry premium publishing. */
const PORTFOLIO_PRODUCT_KEYS = ["portfolio_pro", "bundle"] as const;

/** A subscription that still pays for premium publishing, or whose grace window is running. */
function governingSubscriptionWhere(now: Date) {
  return {
    productKey: { in: [...PORTFOLIO_PRODUCT_KEYS] },
    OR: [
      {
        status: "ACTIVE" as const,
        OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: now } }],
      },
      { status: "CANCELED" as const, currentPeriodEnd: { gt: now } },
      { graceEndsAt: { gt: now } },
    ],
  } satisfies Prisma.SubscriptionWhereInput;
}

/** No publish grant in effect at `now`. */
function noPublishGrantWhere(now: Date) {
  return {
    none: {
      key: ENTITLEMENT_KEYS.PORTFOLIO_PUBLISH,
      startsAt: { lte: now },
      revokedAt: null,
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
  } satisfies Prisma.EntitlementGrantListRelationFilter;
}

/**
 * Premium publications whose paid access is gone for good: what `settleLapsedPortfolios` and
 * `settleLapsedPortfolioFor` move to the free tier.
 *
 * Only premium templates ride on paid access; a free-template row never earns a grace period
 * and is never moved here, whatever the user's billing history says.
 *
 * A LIVE row whose access ended with no provider event (a pass or a time-boxed comp ran out)
 * moves at once (V-222): a pass buys exactly its days, never a paid grace week on top, and the
 * site is never hidden on the way. Not while the owner has a portfolio subscription that can
 * still renew (ACTIVE or PAST_DUE): its late webhook decides, not this sweep.
 *
 * The grace window comes from the subscription (`graceEndsAt`). A GRACE row whose user has
 * no portfolio subscription at all (one an admin parked in GRACE, or one the job moved there
 * before V-222) has no provider clock, so its window is `graceDays` from the transition: the
 * row's `updatedAt`, which that transition was the last write to. A row billing suspended (a cancellation or an
 * expiry with no grace) is already past any window, but only one suspended within
 * `BILLING_RESTORE_WINDOW_DAYS` comes back on its own (owner decision: an older billing suspension
 * stays offline until the owner republishes; it was offline long enough that bringing it back
 * unannounced would surprise them).
 *
 * Never a publication whose document is deleted (trashed or purged): the owner took it down.
 */
function lapsedForGoodWhere(now: Date) {
  const graceCutoff = new Date(now.getTime() - config.portfolio.graceDays * 24 * 60 * 60 * 1000);
  const restoreCutoff = new Date(now.getTime() - BILLING_RESTORE_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  return {
    templateId: { in: [...PREMIUM_PORTFOLIO_TEMPLATE_IDS] },
    document: { deletedAt: null },
    user: {
      entitlementGrants: noPublishGrantWhere(now),
      subscriptions: { none: governingSubscriptionWhere(now) },
    },
    OR: [
      {
        status: "LIVE" as const,
        // Only a pass or comp that ran out, never a subscription that can still renew: a renewal
        // webhook a few minutes late must not drop a paying subscriber to the free template.
        // Subscriptions lapse through billing (the webhook, or the GRACE window it sets).
        user: {
          subscriptions: {
            none: {
              productKey: { in: [...PORTFOLIO_PRODUCT_KEYS] },
              status: { in: ["ACTIVE" as const, "PAST_DUE" as const] },
            },
          },
        },
      },
      {
        status: "GRACE" as const,
        OR: [
          {
            user: {
              subscriptions: { some: { productKey: { in: [...PORTFOLIO_PRODUCT_KEYS] } } },
            },
          },
          { updatedAt: { lte: graceCutoff } },
        ],
      },
      {
        status: "SUSPENDED" as const,
        suspensionReason: { in: [...BILLING_SUSPENSION_REASONS] },
        suspendedAt: { gte: restoreCutoff },
      },
    ],
  } satisfies Prisma.PortfolioPublicationWhereInput;
}

/** How recent a billing suspension must be for the settle step to bring the site back. */
const BILLING_RESTORE_WINDOW_DAYS = 30;

/**
 * The rows the public read serves and the sitemap lists, one predicate for both (V-187): LIVE,
 * or GRACE while the courtesy window runs. A GRACE row whose portfolio subscription grace has
 * lapsed is hidden until `jobs/portfolioAccessJob` moves it to the free tier (decision 6); a GRACE
 * row with no portfolio subscription at all (an expired pass) has no provider clock and serves
 * until the job does. A public GET never writes. A publication whose document is deleted is never
 * served, whatever its status says.
 */
function servedPublicationWhere(now: Date) {
  return {
    document: { deletedAt: null },
    OR: [
      { status: "LIVE" as const },
      {
        status: "GRACE" as const,
        user: { subscriptions: { none: { productKey: { in: [...PORTFOLIO_PRODUCT_KEYS] } } } },
      },
      {
        status: "GRACE" as const,
        user: { subscriptions: { some: governingSubscriptionWhere(now) } },
      },
    ],
  } satisfies Prisma.PortfolioPublicationWhereInput;
}

/**
 * Decision 6: a lapsed premium portfolio stays online on a free template. Each premium template
 * maps to the free one closest in layout, so the site keeps its character as far as it can:
 * Nimbus (an editorial broadsheet, serif display type) → Atelier (the editorial template);
 * Cipher (a structured, technical terminal layout) → Signal (the structured, proof-first one).
 * Anything unmapped falls back to Signal, the default template.
 */
const FREE_TEMPLATE_FOR_PREMIUM: Record<string, "signal" | "atelier"> = {
  nimbus: "atelier",
  cipher: "signal",
};

/** The public address of a published portfolio. */
function publicPortfolioUrl(subdomain: string) {
  return config.nodeEnv === "development"
    ? `http://${subdomain}.localhost:3004`
    : `https://${subdomain}.veriworkly.com`;
}

/** The `templateId` a document's content names, which is what the public page renders (V-299). */
function contentTemplateId(content: Prisma.JsonValue): string | undefined {
  if (!content || typeof content !== "object" || Array.isArray(content)) return undefined;
  const templateId = (content as Record<string, unknown>).templateId;
  return typeof templateId === "string" ? templateId : undefined;
}

/** A template id as the template picker names it ("atelier" → "Atelier"). */
function templateName(templateId: string) {
  return templateId.charAt(0).toUpperCase() + templateId.slice(1);
}

export function freeTemplateFor(templateId: string): "signal" | "atelier" {
  return FREE_TEMPLATE_FOR_PREMIUM[templateId] ?? "signal";
}

/** The SEO block a publisher without `seo_controls` gets (see `resolveSeo`). */
const EMPTY_SEO: PortfolioContentInput["seo"] = { title: "", description: "", socialImage: null };

function utcDay(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function normalizeReferrerHost(referrer?: string) {
  if (!referrer) return "";

  try {
    return new URL(referrer).hostname.toLowerCase().slice(0, 255);
  } catch {
    return "";
  }
}

/**
 * `removeWatermark` arrives inside the client-supplied content payload, so it is a
 * request rather than a fact. The published snapshot must record the server's own
 * decision: a publisher without the `watermark_removal` entitlement always stores
 * `false`, whatever was posted.
 *
 * The public renderer independently guards on `isPremium`, so this is defence in
 * depth - but it also keeps the persisted snapshot honest for everything that reads
 * it later (admin views, support, any future export of the publication).
 */
export function resolveWatermarkFlag(
  requested: boolean | undefined,
  canRemoveWatermark: boolean,
): boolean {
  return canRemoveWatermark ? requested === true : false;
}

/**
 * The SEO block (meta title, description, social image) is a paid control (`seo_controls`,
 * V-142). Without it the published snapshot carries the empty block, and the public page
 * falls back to the name and bio as it does for any portfolio that never set one. The draft
 * keeps what the user typed, so it goes live as soon as they upgrade and republish.
 */
export function resolveSeo(
  requested: PortfolioContentInput["seo"],
  canControlSeo: boolean,
): PortfolioContentInput["seo"] {
  return canControlSeo ? requested : EMPTY_SEO;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A published body moved to the free tier: free template, badge back, no paid SEO block. */
function freeTierSnapshot(
  snapshot: unknown,
  templateId: string,
  canRemoveWatermark: boolean,
  canControlSeo: boolean,
) {
  const body = isRecord(snapshot) ? snapshot : {};

  return {
    ...body,
    templateId,
    removeWatermark: resolveWatermarkFlag(body.removeWatermark === true, canRemoveWatermark),
    seo: canControlSeo ? body.seo : EMPTY_SEO,
  };
}

export class PortfolioService {
  static async listPublicPortfolios(
    limit?: number,
    offset?: number,
    order: "recent" | "stable" = "recent",
  ) {
    type PublicListItem = { subdomain: string; updatedAt: string | Date };

    const cacheKey = await publicPortfolioListCacheKey(limit, offset, order);
    const readCache = async () => (cacheKey ? cacheGet<PublicListItem[]>(cacheKey) : null);
    const cached = await readCache();

    if (cached) return cached;

    const build = async (): Promise<PublicListItem[]> => {
      const result = await prisma.portfolioPublication.findMany({
        where: servedPublicationWhere(new Date()),
        select: { subdomain: true, updatedAt: true },
        // `stable` (the sitemap's paging, V-310) is by id, which never changes; the default is
        // the most recently updated first, with the id breaking ties.
        orderBy: order === "stable" ? { id: "asc" } : [{ updatedAt: "desc" }, { id: "asc" }],
        take: limit ?? PUBLIC_LIST_MAX,
        skip: offset,
      });

      if (cacheKey) await cacheSet(cacheKey, result, 300);

      return result;
    };

    // Concurrent cold misses (the sitemap build fans out) run the query once (V-117).
    return cacheKey ? singleFlight(cacheKey, 2_000, build, readCache) : build();
  }

  /**
   * Read-only: rows are looked up by their stored key, so a reserved name is simply one with no
   * publication behind it (404) while a site published before the name was reserved still
   * serves. Which rows serve is `servedPublicationWhere`, shared with the sitemap list.
   *
   * The billing state itself (LIVE/GRACE) is not public (V-187). The renderer gets two separate
   * facts (V-174): `isPaid`, the owner's portfolio access is in effect (or the GRACE courtesy window
   * runs), which decides the badge, the custom subdomain and the extra pages on any template;
   * and `isPremiumTemplate`, which is about the template only. `isPremium` (both) is kept for
   * renderers that have not moved to the two fields yet.
   */
  static async getPublicPortfolio(subdomain: string) {
    const normalized = portfolioSubdomainLookupKey(subdomain);

    if (!normalized) return null;

    const cacheKey = await publicPortfolioCacheKey(normalized);
    const now = new Date();

    const cached =
      cacheKey &&
      (await cacheGet<{
        id: string;
        subdomain: string;
        templateId: string;
        snapshot: unknown;
        updatedAt: string;
        isPaid: boolean;
        isPremiumTemplate: boolean;
        isPremium: boolean;
      }>(cacheKey));

    if (cached) return cached;

    const publication = await prisma.portfolioPublication.findFirst({
      where: { subdomain: normalized, ...servedPublicationWhere(now) },
      select: {
        id: true,
        userId: true,
        subdomain: true,
        templateId: true,
        snapshot: true,
        status: true,
        updatedAt: true,
        user: {
          select: {
            // The furthest grace clock, which bounds how long a GRACE row may be cached.
            subscriptions: {
              where: { productKey: { in: [...PORTFOLIO_PRODUCT_KEYS] }, graceEndsAt: { gt: now } },
              select: { graceEndsAt: true },
              orderBy: { graceEndsAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    if (!publication) return null;

    // The site's paid features (no badge, subdomain redirect, sub-pages) are portfolio features,
    // so they follow the portfolio entitlement (Creator Pro, the bundle, a pass, or an admin comp
    // of one), not the account-wide `EntitlementService.isPaid`: an AI Credits subscription lifts
    // the document limit but buys nothing on a portfolio. During GRACE the grant is already gone
    // but the site still renders as paid until it moves to the free tier.
    const isPaid =
      publication.status === "GRACE" ||
      (await EntitlementService.has(publication.userId, PORTFOLIO_PUBLISH, now));
    const isPremiumTemplate = isPremiumPortfolioTemplate(publication.templateId);

    const result = {
      id: publication.id,
      subdomain: publication.subdomain,
      templateId: publication.templateId,
      snapshot: publication.snapshot,
      updatedAt: publication.updatedAt.toISOString(),
      isPaid,
      isPremiumTemplate,
      isPremium: isPremiumTemplate && isPaid,
    };

    let ttl = 600;
    const graceEndsAt = publication.user.subscriptions[0]?.graceEndsAt ?? null;

    if (publication.status === "GRACE" && graceEndsAt) {
      const msLeft = new Date(graceEndsAt).getTime() - Date.now();

      if (msLeft > 0) {
        ttl = Math.min(600, Math.ceil(msLeft / 1000));
      } else {
        ttl = 0;
      }
    }

    if (ttl > 0 && cacheKey) await cacheSet(cacheKey, result, ttl);

    return result;
  }

  static async getDraft(userId: string) {
    const draft = await prisma.document.findFirst({
      where: { userId, type: "PORTFOLIO", deletedAt: null },
      orderBy: { updatedAt: "desc" },
      select: DRAFT_SELECT,
    });

    return draft && draftView(draft);
  }

  static async getMe(userId: string) {
    const [draft, publication, billing] = await Promise.all([
      this.getDraft(userId),
      prisma.portfolioPublication.findUnique({
        where: { userId },
        select: {
          subdomain: true,
          status: true,
          publishedRevision: true,
          publishedAt: true,
          updatedAt: true,
        },
      }),
      BillingService.getSummary(userId),
    ]);

    return { draft, publication, billing };
  }

  static async getPreview(userId: string, documentId: string) {
    const document = await prisma.document.findFirst({
      where: { id: documentId, userId, type: "PORTFOLIO", deletedAt: null },
      select: { id: true, templateId: true, content: true, revision: true, updatedAt: true },
    });

    if (!document) throw new ApiError(404, "Portfolio draft not found.");

    return document;
  }

  static async isSubdomainAvailable(userId: string, value: string) {
    const subdomain = normalizeSubdomain(value, await ownedSubdomains(userId));

    const existing = await prisma.portfolioPublication.findUnique({
      where: { subdomain },
      select: { userId: true },
    });

    return { subdomain, available: !existing || existing.userId === userId };
  }

  static async saveDraft(
    userId: string,
    input: {
      documentId?: string;
      subdomain: string;
      revision?: number;
      snapshot: PortfolioContentInput;
    },
  ) {
    const subdomain = normalizeSubdomain(input.subdomain, await ownedSubdomains(userId));

    // `content` too: the images the body being replaced referenced are released after the save.
    const existing = input.documentId
      ? await prisma.document.findFirst({
          where: { id: input.documentId, userId, type: "PORTFOLIO", deletedAt: null },
          select: { id: true, revision: true, content: true },
        })
      : await prisma.document.findFirst({
          where: { userId, type: "PORTFOLIO", deletedAt: null },
          orderBy: { updatedAt: "desc" },
          select: { id: true, revision: true, content: true },
        });

    if (input.documentId && !existing) throw new ApiError(404, "Portfolio draft not found.");

    if (existing && input.revision !== existing.revision)
      throw new ApiError(409, "Portfolio draft changed in another session.", {
        revision: existing.revision,
      });

    try {
      // The subdomain has its own column (V-301); the document slug is an ordinary one, set once
      // on create from the title and never tied to the subdomain.
      // The write is conditional on the revision read above (V-304): a second tab saving the same
      // revision in the meantime matches no row, and gets the 409 below instead of overwriting.
      const document = existing
        ? await prisma.document.update({
            where: { id: existing.id, revision: existing.revision },
            data: {
              content: input.snapshot as Prisma.InputJsonValue,
              templateId: input.snapshot.templateId,
              portfolioSubdomain: subdomain,
              revision: { increment: 1 },
              lastSyncedAt: new Date(),
            },
            select: DRAFT_SELECT,
          })
        : await createDraftDocument(userId, {
            portfolioSubdomain: subdomain,
            content: input.snapshot as Prisma.InputJsonValue,
            templateId: input.snapshot.templateId,
          });

      await Promise.all([
        bumpGeneration(...documentCacheNamespaces(userId, document.id)),
        cacheDel(userProfileCacheKey(userId)),
      ]);

      // A replaced avatar or cover is deleted once nothing references it (V-045).
      if (existing)
        await PortfolioAssetService.releaseReplacedAssets(
          userId,
          referencedAssetIds(existing.content),
        );

      return draftView(document);
    } catch (error) {
      if (
        existing &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      )
        throw new ApiError(409, "Portfolio draft changed in another session.");

      // Only a first save still colliding on its document slug after the retries gets here.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
        throw new ApiError(409, "The portfolio draft could not be saved. Try again.");

      throw error;
    }
  }

  static async publish(
    userId: string,
    input: { documentId: string; subdomain: string; revision: number },
  ) {
    const hasSubscription = await EntitlementService.has(userId, PORTFOLIO_PUBLISH);

    const document = await prisma.document.findFirst({
      where: { id: input.documentId, userId, type: "PORTFOLIO", deletedAt: null },
    });

    if (!document) throw new ApiError(404, "Portfolio draft not found.");

    // A moderator's lock on the document (a "Make private" or a force-unpublish, V-207), checked
    // before the publication's own lock below. Lifted only by a moderator. Checked again,
    // conditionally, inside the transaction below (V-226).
    if (document.moderatedPrivateAt) throw new ApiError(403, MODERATED_MESSAGE);

    // Both the column and the content's own `templateId` are checked (V-299): the public page
    // renders the snapshot's, so a premium template in either is refused without a plan. The
    // publication row and the snapshot both take the content's below.
    const premiumTemplate = [contentTemplateId(document.content), document.templateId].find(
      (templateId): templateId is string =>
        typeof templateId === "string" && isPremiumPortfolioTemplate(templateId),
    );
    if (premiumTemplate && !hasSubscription) {
      throw new ApiError(
        402,
        `Publishing the premium template "${templateName(premiumTemplate)}" requires ${UNLOCK_PHRASES.portfolioPro}.`,
      );
    }

    if (document.revision !== input.revision) {
      throw new ApiError(409, "Save the latest draft before publishing.");
    }

    const existingPublication = await prisma.portfolioPublication.findUnique({
      where: { userId },
      select: {
        documentId: true,
        subdomain: true,
        status: true,
        suspensionReason: true,
        // The images the snapshot being replaced shows are released after the publish.
        snapshot: true,
      },
    });

    const subdomain = normalizeSubdomain(
      input.subdomain,
      // Only the published name is grandfathered, never the draft slug (V-300).
      existingPublication ? [existingPublication.subdomain] : [],
    );

    const publishable = portfolioContentSchema.safeParse(document.content);

    if (!publishable.success) {
      // The standard `[{ path, message }]` details (V-135), not zod's `flatten()` shape.
      throw new ApiError(
        400,
        "Complete the required portfolio details before publishing.",
        handleValidationError(publishable.error).details,
      );
    }

    // Every image the body shows, extra pages included (the same walk the asset cleanup uses).
    // Each must be one of the owner's finished uploads; a slot with a url and no asset id is a
    // hot-link and is refused (V-227).
    if (hasUnownedImageSlot(publishable.data))
      throw new ApiError(400, "Portfolio contains an unavailable or invalid image.");
    const assetIds = [...referencedAssetIds(publishable.data)];
    const assetKeys = new Map<string, string>();
    if (assetIds.length) {
      const ownedAssets = await prisma.portfolioAsset.findMany({
        where: { id: { in: assetIds }, userId, status: "READY" },
        select: { id: true, key: true },
      });
      if (ownedAssets.length !== assetIds.length)
        throw new ApiError(400, "Portfolio contains an unavailable or invalid image.");
      if (!config.r2.publicBaseUrl)
        throw new ApiError(503, "Portfolio media delivery is not configured.");
      for (const asset of ownedAssets) assetKeys.set(asset.id, asset.key);
    }

    // See resolveWatermarkFlag and resolveSeo: the posted values are requests, not facts.
    const [canRemoveWatermark, canControlSeo] = await Promise.all([
      EntitlementService.has(userId, WATERMARK_REMOVAL),
      EntitlementService.has(userId, SEO_CONTROLS),
    ]);

    // Image urls are rebuilt from the stored keys, whatever the draft said (V-227).
    const snapshot: PortfolioContentInput = {
      ...withStoredAssetUrls(publishable.data, assetKeys),
      removeWatermark: resolveWatermarkFlag(publishable.data.removeWatermark, canRemoveWatermark),
      seo: resolveSeo(publishable.data.seo, canControlSeo),
    };

    // Intentional: a takedown (force-unpublish included, which now keeps the row, V-225) blocks
    // publishing any portfolio document, not just the one taken down, until a moderator lifts it.
    // Otherwise the owner could get round a takedown by publishing a copy from a new document.
    if (existingPublication && isModerationLocked(existingPublication))
      throw new ApiError(403, MODERATED_MESSAGE);

    try {
      const publication = await prisma.$transaction(async (tx) => {
        if (existingPublication && existingPublication.documentId !== document.id) {
          await tx.document.update({
            where: { id: existingPublication.documentId },
            data: { visibility: "PRIVATE" },
          });
        }

        // Both writes are conditional on the moderation state (V-226): a "Make private" or a
        // takedown that committed after the reads above wins, and nothing here commits.
        const shown = await tx.document.updateMany({
          where: { id: document.id, userId, deletedAt: null, moderatedPrivateAt: null },
          data: { visibility: "PUBLIC" },
        });
        if (shown.count === 0) throw new ApiError(403, MODERATED_MESSAGE);

        if (!existingPublication)
          return tx.portfolioPublication.create({
            data: {
              userId,
              documentId: document.id,
              subdomain,
              templateId: publishable.data.templateId,
              snapshot: snapshot as Prisma.InputJsonValue,
              publishedRevision: document.revision,
            },
          });

        const republished = await tx.portfolioPublication.updateMany({
          where: { userId, ...NOT_MODERATION_LOCKED },
          data: {
            documentId: document.id,
            subdomain,
            templateId: publishable.data.templateId,
            snapshot: snapshot as Prisma.InputJsonValue,
            publishedRevision: document.revision,
            status: "LIVE",
            suspensionReason: null,
            suspendedAt: null,
            publishedAt: new Date(),
          },
        });
        if (republished.count === 0) throw new ApiError(403, MODERATED_MESSAGE);

        return tx.portfolioPublication.findUniqueOrThrow({ where: { userId } });
      });

      const subdomains = [subdomain, existingPublication?.subdomain ?? ""];

      await Promise.all([
        invalidatePublicPortfolioCaches(subdomains),
        bumpGeneration(
          ...documentCacheNamespaces(userId, document.id),
          ...(existingPublication && existingPublication.documentId !== document.id
            ? [cacheNamespaces.document(userId, existingPublication.documentId)]
            : []),
        ),
      ]);

      void revalidatePublicPortfolios(subdomains);

      // Images only the replaced snapshot showed are deleted now (V-045).
      if (existingPublication)
        await PortfolioAssetService.releaseReplacedAssets(
          userId,
          referencedAssetIds(existingPublication.snapshot),
        );

      const publicUrl = publicPortfolioUrl(publication.subdomain);

      if (existingPublication?.status !== "LIVE") {
        void this.notifyPortfolioLive(userId, publicUrl);
      }

      return { ...publication, publicUrl };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
        throw new ApiError(409, "That portfolio subdomain is already in use.");

      throw error;
    }
  }

  private static async notifyPortfolioLive(userId: string, publicUrl: string) {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
      if (!user?.email) return;

      await sendPortfolioUpdatedEmail(user.email, publicUrl);
    } catch (error) {
      logger.warn("Failed to send portfolio live email", error);
    }
  }

  static async unpublish(userId: string) {
    const publication = await prisma.portfolioPublication.findUnique({ where: { userId } });

    if (!publication) throw new ApiError(404, "Portfolio is not published.");

    const result = await prisma.$transaction(async (tx) => {
      await tx.document.update({
        where: { id: publication.documentId },
        data: { visibility: "PRIVATE" },
      });

      // A moderated row keeps its moderation reason: rewriting it as the user's own takedown
      // would let the next Publish lift the lock. Conditional, so a takedown committed after the
      // read above is kept too (V-226). On a locked row the unpublish is recorded under the lock
      // instead, so the moderator's lift leaves the site offline as the owner chose (V-285).
      await tx.portfolioPublication.updateMany({
        where: { userId, ...NOT_MODERATION_LOCKED },
        data: {
          status: "SUSPENDED",
          suspensionReason: USER_UNPUBLISHED_REASON,
          suspendedAt: new Date(),
        },
      });
      await recordOwnerUnpublishUnderLock(tx, { userId });

      return tx.portfolioPublication.findUniqueOrThrow({ where: { userId } });
    });

    await Promise.all([
      invalidatePublicPortfolioCaches([publication.subdomain]),
      bumpGeneration(...documentCacheNamespaces(userId, publication.documentId)),
    ]);

    void revalidatePublicPortfolios([publication.subdomain]);

    return result;
  }

  /**
   * Settles premium publications whose paid access has lapsed. Takes no lock and throws on
   * failure: `jobs/portfolioAccessJob` runs it hourly under the portfolio-access lock.
   *
   * A premium publication whose paid access is gone for good (`lapsedForGoodWhere`: a LIVE row
   * whose pass or comp ran out, a GRACE window that is over, or a recent billing suspension) does
   * not go offline: it drops to the free tier and stays LIVE (owner decision 6, see
   * `PortfolioService.dropToFreeTier`). Only a failed subscription renewal earns a grace window,
   * and billing sets that one; the job never moves a row into GRACE (V-222). Moderation takedowns
   * and the user's own unpublish are not billing's, so they are never touched here.
   */
  static async settleLapsedPortfolios() {
    const subdomains = await this.dropLapsedToFreeTier(lapsedForGoodWhere(new Date()));

    if (subdomains.length > 0) {
      logger.info("Moved lapsed premium portfolios to the free tier", { count: subdomains.length });
      await invalidatePublicPortfolioCaches(subdomains);
      void revalidatePublicPortfolios(subdomains);
    }
  }

  /**
   * Step 2 of `settleLapsedPortfolios` for one user, run by billing right after a webhook or an
   * admin edit lapses their premium portfolio (decision 6): the site moves to its free template
   * at once instead of sitting offline until the hourly job. Only rows billing suspended, or a
   * grace window that is over, qualify; a moderation takedown or the user's own unpublish never
   * does. Returns the subdomains it moved, with their public caches already cleared.
   */
  static async settleLapsedPortfolioFor(userId: string) {
    const moved = await this.dropLapsedToFreeTier({ userId, ...lapsedForGoodWhere(new Date()) });

    if (moved.length > 0) {
      await invalidatePublicPortfolioCaches(moved);
      void revalidatePublicPortfolios(moved);
    }

    return moved;
  }

  private static async dropLapsedToFreeTier(where: Prisma.PortfolioPublicationWhereInput) {
    const lapsedForGood = await prisma.portfolioPublication.findMany({
      where,
      select: { id: true, userId: true },
    });

    const moved: string[] = [];

    for (const publication of lapsedForGood) {
      // The full predicate is re-checked inside the write, so a renewal that set the row LIVE
      // between this read and that write is not overwritten.
      const subdomain = await this.dropToFreeTier(publication, where);
      if (subdomain) moved.push(subdomain);
    }

    return moved;
  }

  /**
   * Decision 6: a premium publication whose paid access has lapsed (grace over, or billing
   * suspended it) goes back online on the free tier instead of staying offline. The template
   * switches to `freeTemplateFor` in the row and in the snapshot, the badge comes back and the
   * paid SEO block is dropped, as a free publish would store them. The rest of the snapshot is
   * kept as published, so every image it shows stays referenced and protected from the asset
   * sweep, and `publishedRevision` is unchanged (nothing new from the draft went live).
   *
   * The draft that was published follows, if it still sits on that premium template, so the
   * owner can republish without an upgrade prompt; a draft already moved on is left alone. Its
   * revision is bumped (a stale editor gets the usual 409, never a silent overwrite).
   *
   * `stillLapsed` is the caller's predicate, re-checked in the write under the user's billing
   * lock (the advisory lock `BillingService` takes), so a renewal that lands first wins.
   * Returns the subdomain when the row moved, `null` when it no longer qualified.
   */
  static async dropToFreeTier(
    publication: { id: string; userId: string },
    stillLapsed: Prisma.PortfolioPublicationWhereInput,
  ) {
    const row = await prisma.portfolioPublication.findFirst({
      where: { id: publication.id, ...stillLapsed },
      select: {
        userId: true,
        documentId: true,
        subdomain: true,
        templateId: true,
        snapshot: true,
        suspendedAt: true,
        status: true,
        updatedAt: true,
      },
    });

    if (!row) return null;

    const freeTemplate = freeTemplateFor(row.templateId);
    const [canRemoveWatermark, canControlSeo] = await Promise.all([
      EntitlementService.has(row.userId, WATERMARK_REMOVAL),
      EntitlementService.has(row.userId, SEO_CONTROLS),
    ]);
    const snapshot = freeTierSnapshot(
      row.snapshot,
      freeTemplate,
      canRemoveWatermark,
      canControlSeo,
    );

    const draftMoved = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${row.userId}))`;

      const moved = await tx.portfolioPublication.updateMany({
        where: { AND: [{ id: publication.id, templateId: row.templateId }, stillLapsed] },
        data: {
          status: "LIVE",
          suspensionReason: null,
          suspendedAt: null,
          templateId: freeTemplate,
          snapshot: snapshot as Prisma.InputJsonValue,
        },
      });

      if (moved.count === 0) return null;

      const draft = await tx.document.findFirst({
        where: { id: row.documentId, templateId: row.templateId, deletedAt: null },
        select: { revision: true, content: true },
      });

      if (!draft) return false;

      const drafted = await tx.document.updateMany({
        where: { id: row.documentId, revision: draft.revision },
        data: {
          templateId: freeTemplate,
          content: {
            ...(isRecord(draft.content) ? draft.content : {}),
            templateId: freeTemplate,
          } as Prisma.InputJsonValue,
          revision: { increment: 1 },
        },
      });

      return drafted.count > 0;
    });

    if (draftMoved === null) return null;

    await Promise.all([
      bumpGeneration(...documentCacheNamespaces(row.userId, row.documentId)),
      cacheDel(userProfileCacheKey(row.userId)),
    ]);

    logger.info("Moved a lapsed premium portfolio to the free tier", {
      publicationId: publication.id,
      from: row.templateId,
      to: freeTemplate,
      draftMoved,
    });

    // The owner hears about it once per lapse: the claim is keyed on the publication and the
    // moment it went offline or into grace, so a later lapse of the same site is a new email.
    const lapsedAt = (row.suspendedAt ?? row.updatedAt).toISOString();
    void notifyOnce("portfolio_free_tier", `${publication.id}:${lapsedAt}`, row.userId, {
      template: "portfolio_free_tier",
      details: {
        freeTemplateName: templateName(freeTemplate),
        previousTemplateName: templateName(row.templateId),
        portfolioUrl: publicPortfolioUrl(row.subdomain),
        // A GRACE row stayed online; only a suspended one is "back".
        wasOffline: row.status === "SUSPENDED",
      },
    });

    return row.subdomain;
  }

  static async recordView(subdomain: string, referrer?: string, ipAddress?: string) {
    const publicationId = await this.servedPublicationId(subdomain);

    if (!publicationId) throw new ApiError(404, "Portfolio not found");

    await this.bufferView(publicationId, normalizeReferrerHost(referrer), ipAddress);
  }

  /**
   * The id of the publication a subdomain serves, for the view beacon (V-052): a small cached id,
   * not the public page (up to a few MB of snapshot) that `getPublicPortfolio` reads. Same rows as
   * the public read (`servedPublicationWhere`). Cached for a minute, so a site taken down can
   * still count views for that long; the flush keeps them only while the publication exists.
   */
  private static async servedPublicationId(subdomain: string) {
    const normalized = portfolioSubdomainLookupKey(subdomain);
    if (!normalized) return null;

    const cacheKey = `portfolio:view-target:${normalized}`;
    const cached = await cacheGet<string>(cacheKey);
    if (cached) return cached;

    const publication = await prisma.portfolioPublication.findFirst({
      where: { subdomain: normalized, ...servedPublicationWhere(new Date()) },
      select: { id: true },
    });
    if (!publication) return null;

    await cacheSet(cacheKey, publication.id, VIEW_TARGET_TTL_SECONDS);
    return publication.id;
  }

  /**
   * Buffers one view for today in a single script (V-114): the dedup check, the field-cap check
   * (past the cap a new referrer folds into the publication's direct field) and both counters.
   * Returns false for a repeat view inside the dedup window.
   */
  static async bufferView(publicationId: string, referrerHost: string, ipAddress?: string) {
    const dateKey = utcDay().toISOString().slice(0, 10);
    const dedupKey = ipAddress
      ? `portfolio:views:dedup:${publicationId}:${hashForAnalytics(ipAddress)}`
      : "";

    const recorded = await getRedis().eval(BUFFER_PORTFOLIO_VIEW_SCRIPT, {
      keys: [
        `portfolio:views:buffer:${dateKey}`,
        `portfolio:views:pending:${publicationId}`,
        dedupKey,
      ],
      arguments: [
        `${publicationId}:${referrerHost}`,
        `${publicationId}:`,
        String(MAX_VIEW_BUFFER_FIELDS),
        dateKey,
        String(VIEW_BUFFER_TTL_SECONDS),
        String(VIEW_DEDUP_WINDOW_SECONDS),
      ],
    });

    return Number(recorded) === 1;
  }

  static async getPendingViewDates() {
    const redis = getRedis();
    const dates = new Set<string>();

    for await (const keys of redis.scanIterator({
      MATCH: "portfolio:views:buffer:*",
      COUNT: 100,
    })) {
      const keyList = Array.isArray(keys) ? keys : [keys];

      for (const key of keyList) {
        const match = /^portfolio:views:buffer:(\d{4}-\d{2}-\d{2})(?::processing)?$/.exec(key);

        if (match) dates.add(match[1]);
      }
    }

    return [...dates].sort();
  }

  static async flushViewsForDate(dateKey: string) {
    const redis = getRedis();
    const key = `portfolio:views:buffer:${dateKey}`;
    const processingKey = `${key}:processing`;
    const batchKey = `${processingKey}:batch-id`;
    const pendingAdjustedKey = `${processingKey}:pending-adjusted`;
    const lockKey = `${key}:flush-lock`;

    // Serialize flush attempts for this date so a manual admin retry overlapping the cron tick
    // (or a rolling deploy briefly running two worker processes) can't race the same batch id and
    // permanently discard that day's buffered views on a unique-constraint rollback. A token
    // lock, renewed while the flush runs and released by compare-and-delete (V-127).
    const lock = await acquireJobLock(lockKey, { ttlMs: VIEW_FLUSH_LOCK_SECONDS * 1000 });

    if (!lock) return { dateKey, flushedCount: 0, skipped: true as const };

    try {
      if (!(await redis.exists(processingKey))) {
        try {
          await redis.rename(key, processingKey);
        } catch (error) {
          if (error instanceof Error && error.message.includes("no such key"))
            return { dateKey, flushedCount: 0 };

          throw error;
        }
      }

      const data = await redis.hGetAll(processingKey);
      const entries = Object.entries(data);

      if (entries.length === 0) {
        await redis.del([processingKey, batchKey, pendingAdjustedKey]);
        return { dateKey, flushedCount: 0 };
      }

      // No TTL on purpose: under volatile-lru a batch id with a TTL could be evicted mid-retry and
      // the retry would commit the same views again under a new id. It is deleted with the batch.
      await redis.set(batchKey, randomUUID(), { NX: true });
      const batchId = await redis.get(batchKey);

      if (!batchId) throw new Error(`Failed to initialize portfolio views batch for ${dateKey}`);

      const publicationIds = [
        ...new Set(entries.map(([field]) => field.slice(0, field.indexOf(":"))).filter(Boolean)),
      ];
      const survivingPublications = new Set(
        (
          await prisma.portfolioPublication.findMany({
            where: { id: { in: publicationIds } },
            select: { id: true },
          })
        ).map((publication) => publication.id),
      );
      // Computed outside the transaction (V-124), so the P2002 recovery below has them too.
      let flushedCount = 0;
      const pendingAdjustments = new Map<string, number>();
      const rows = new Map<
        string,
        { publicationId: string; referrerHost: string; count: number }
      >();

      for (const [field, rawCount] of entries) {
        const separator = field.indexOf(":");
        const publicationId = field.slice(0, separator);
        const referrerHost = field.slice(separator + 1);
        if (!publicationId || !survivingPublications.has(publicationId)) continue;
        const count = parseInt(rawCount, 10) || 0;
        if (count <= 0) continue;
        const pendingKey = `portfolio:views:pending:${publicationId}`;
        pendingAdjustments.set(pendingKey, (pendingAdjustments.get(pendingKey) ?? 0) + count);
        const rowKey = `${publicationId}:${referrerHost}`;
        const row = rows.get(rowKey) ?? { publicationId, referrerHost, count: 0 };
        row.count += count;
        rows.set(rowKey, row);
        flushedCount += count;
      }

      const values = [...rows.values()];

      try {
        // V-103: one statement for the whole day instead of one upsert per field inside a 5 s
        // interactive transaction. The batch row and the counts still commit together.
        await prisma.$transaction([
          prisma.viewFlushBatch.create({ data: { id: batchId, kind: "portfolio" } }),
          prisma.$executeRaw`
            INSERT INTO "PortfolioViewDaily"
              ("id", "publicationId", "date", "referrerHost", "count", "createdAt", "updatedAt")
            SELECT gen_random_uuid()::text, v."publicationId", ${dateKey}::date::timestamp,
                   v."referrerHost", v."count", now(), now()
            FROM unnest(
              ${values.map((row) => row.publicationId)}::text[],
              ${values.map((row) => row.referrerHost)}::text[],
              ${values.map((row) => row.count)}::int[]
            ) AS v("publicationId", "referrerHost", "count")
            ON CONFLICT ("publicationId", "date", "referrerHost")
            DO UPDATE SET "count" = "PortfolioViewDaily"."count" + EXCLUDED."count",
                          "updatedAt" = now()
          `,
        ]);
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
          throw error;
        }

        // We hold the flush lock, so a batch-id collision can only mean a prior attempt already
        // committed this exact batch before crashing without cleaning up Redis. Confirm that
        // rather than assuming it.
        const existingBatch = await prisma.viewFlushBatch.findUnique({ where: { id: batchId } });
        if (!existingBatch) throw error;
      }

      const staleCount = publicationIds.length - survivingPublications.size;
      if (staleCount > 0)
        logger.warn("Discarded portfolio views for deleted publications", { staleCount });

      // Committed. A runner that took the lock over meanwhile may be reading `:processing`;
      // deleting it and the batch id under them would let them commit these views again under
      // a fresh id. They finish the cleanup (their retry hits the batch row and confirms it).
      if (!(await lock.stillOwner())) {
        logger.warn(
          "Views flush lost its lock after committing; leaving Redis cleanup to the holder",
          {
            dateKey,
          },
        );
        return { dateKey, flushedCount };
      }

      const pendingKeys = [...pendingAdjustments.keys()];
      await redis.eval(SETTLE_PENDING_VIEWS_SCRIPT, {
        keys: [pendingAdjustedKey, ...pendingKeys],
        arguments: [dateKey, ...pendingKeys.map((key) => String(pendingAdjustments.get(key)))],
      });

      await redis.del([processingKey, batchKey, pendingAdjustedKey]);
      return { dateKey, flushedCount };
    } finally {
      await lock.release();
    }
  }

  static async getAnalytics(userId: string) {
    // Visitor analytics is a Creator Pro feature. This is the enforcement point — the
    // dashboard's lock overlay is presentation only, so without this check the numbers
    // were still serialized into the page (and readable straight off the endpoint) for
    // every free account. Gated on the `analytics` grant itself (V-142), which every
    // portfolio plan carries alongside `portfolio_publish`.
    if (!(await EntitlementService.has(userId, ANALYTICS)))
      return { locked: true, totalViews: 0, daily: [], referrers: [] };

    const publication = await prisma.portfolioPublication.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!publication) return { locked: false, totalViews: 0, daily: [], referrers: [] };

    const [totals, daily, referrers] = await Promise.all([
      prisma.portfolioViewDaily.aggregate({
        where: { publicationId: publication.id },
        _sum: { count: true },
      }),

      // The lifetime rollup rows (VIEW_ROLLUP_DATE) count toward the total, not as a day.
      prisma.portfolioViewDaily.groupBy({
        by: ["date"],
        where: { publicationId: publication.id, date: { gt: VIEW_ROLLUP_DATE } },
        _sum: { count: true },
        orderBy: { date: "desc" },
        take: 30,
      }),
      prisma.portfolioViewDaily.groupBy({
        by: ["referrerHost"],
        where: { publicationId: publication.id, referrerHost: { not: "" } },
        _sum: { count: true },
        orderBy: { _sum: { count: "desc" } },
        take: 10,
      }),
    ]);

    let totalViews = totals._sum.count ?? 0;
    const dailyMap = new Map<string, number>();

    daily.forEach((item) => {
      const dateStr = item.date.toISOString().slice(0, 10);
      dailyMap.set(dateStr, item._sum.count ?? 0);
    });

    try {
      const pending = await getRedis().hGetAll(`portfolio:views:pending:${publication.id}`);

      for (const [dateStr, rawCount] of Object.entries(pending)) {
        const count = Math.max(0, parseInt(rawCount, 10) || 0);
        totalViews += count;
        dailyMap.set(dateStr, (dailyMap.get(dateStr) ?? 0) + count);
      }
    } catch (err) {
      logger.error("Failed to read buffered portfolio views from Redis", err);
    }

    const sortedDaily = Array.from(dailyMap.entries())
      .map(([dateStr, count]) => ({
        date: new Date(`${dateStr}T00:00:00.000Z`),
        count,
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 30);

    return {
      locked: false,
      totalViews,
      daily: sortedDaily,
      referrers: referrers.map((item) => ({
        host: item.referrerHost,
        count: item._sum.count ?? 0,
      })),
    };
  }
}
