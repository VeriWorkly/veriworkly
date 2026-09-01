import { z } from "zod";
import DodoPayments from "dodopayments";

import { Prisma, type Subscription as PrismaSubscription } from "@prisma/client";

import { config } from "#config";

import {
  dodoPaymentSchema,
  dodoWebhookEventSchema,
  dodoSubscriptionSchema,
} from "#validators/billingValidator";

import { prisma } from "#lib/prisma";
import { logger } from "#lib/logger";
import { ApiError } from "#lib/errors";
import { cacheDel, cacheGet, cacheSet, getRedis } from "#lib/redis";
import { userProfileCacheKey } from "#lib/cacheKeys";
import { EntitlementService } from "#services/entitlementService";
import { AffiliateService } from "#services/affiliate/index";
import { CreditService } from "#services/creditService";
import { ApiKeyService } from "#services/apiKeyService";
import {
  sendSubscriptionPurchasedEmail,
  sendSubscriptionCancelledEmail,
} from "#services/mail/billingMail";
import {
  creditPackCatalog,
  isCreditPackKey,
  ENTITLEMENT_KEYS,
  getProductFromProviderId,
  getProviderProductId,
  isProductKey,
  productCatalog,
  publicCatalog,
  publicCreditEconomics,
  type CreditPackKey,
  type ProductKey,
  type CatalogInterval,
} from "#services/productCatalog";
import {
  revalidatePublicPortfolios,
  invalidatePublicPortfolioCaches,
} from "#utils/portfolioPublicationCache";

type BillingIntervalInput = "one_day" | "seven_day" | "monthly" | "annual";
const BILLING_SUMMARY_TTL_SECONDS = 60;
const BILLING_HISTORY_TTL_SECONDS = 60;
const CHECKOUT_LOCK_TTL_SECONDS = 600;
const WEBHOOK_LOCK_TTL_SECONDS = 30;
const WEBHOOK_LOCK_WAIT_ATTEMPTS = 10;
const WEBHOOK_LOCK_WAIT_MS = 300;

/**
 * Prisma's interactive-transaction defaults (maxWait 2s / timeout 5s) are tuned for single-shot
 * writes. The entitlement transaction below issues a variable number of sequential upserts, so
 * under pool contention it can exceed 5s and abort with P2028 *after* the provider already
 * charged the customer — leaving billing state behind reality until the webhook is retried.
 */
const BILLING_TRANSACTION_OPTIONS = { timeout: 20_000, maxWait: 10_000 } as const;

function billingSummaryCacheKey(userId: string) {
  return `billing:summary:${userId}`;
}

function billingHistoryCacheKey(userId: string) {
  return `billing:history:${userId}`;
}

function getDodoClient() {
  if (!config.dodo.apiKey) throw new ApiError(503, "Billing is not configured.");

  return new DodoPayments({
    bearerToken: config.dodo.apiKey,
    webhookKey: config.dodo.webhookSecret || undefined,
    environment: config.dodo.environment,
  });
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function addMonths(date: Date, months: number) {
  const d = new Date(date.getTime());
  d.setMonth(d.getMonth() + months);
  return d;
}

function addYears(date: Date, years: number) {
  const d = new Date(date.getTime());
  d.setFullYear(d.getFullYear() + years);
  return d;
}

function statusFromDodo(rawStatus: string) {
  switch (rawStatus) {
    case "active":
      return "ACTIVE" as const;
    // Kept even though we no longer create trials. Any subscription started before
    // trials were removed can still report this status, and the provider owns the
    // lifecycle - dropping the case would map a live trialing subscriber to INACTIVE
    // and revoke access they have paid for.
    case "trialing":
      return "TRIALING" as const;
    case "on_hold":
    case "failed":
      return "PAST_DUE" as const;
    case "cancelled":
    case "expired":
      return "CANCELED" as const;
    default:
      return "INACTIVE" as const;
  }
}

function accessStatus(
  subscription: Pick<PrismaSubscription, "status" | "currentPeriodEnd" | "graceEndsAt"> | null,
) {
  if (!subscription) return { canPublish: false, publicationStatus: "SUSPENDED" as const };

  const now = new Date();

  if (
    (subscription.status === "ACTIVE" || subscription.status === "TRIALING") &&
    (!subscription.currentPeriodEnd || subscription.currentPeriodEnd > now)
  )
    return { canPublish: true, publicationStatus: "LIVE" as const };

  if (subscription.graceEndsAt && subscription.graceEndsAt > now)
    return { canPublish: false, publicationStatus: "GRACE" as const };

  return { canPublish: false, publicationStatus: "SUSPENDED" as const };
}

export class BillingService {
  static async getLatestSubscription(userId: string) {
    return prisma.subscription.findFirst({ where: { userId }, orderBy: { updatedAt: "desc" } });
  }

  static async getSummary(userId: string) {
    const cached = await cacheGet<Awaited<ReturnType<typeof BillingService.buildSummary>>>(
      billingSummaryCacheKey(userId),
    );
    if (cached) return cached;
    const result = await this.buildSummary(userId);
    await cacheSet(billingSummaryCacheKey(userId), result, BILLING_SUMMARY_TTL_SECONDS);
    return result;
  }

  private static async buildSummary(userId: string) {
    const [user, subscription, activeSubscriptions, entitlements, wallet] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      }),
      this.getLatestSubscription(userId),
      prisma.subscription.findMany({
        where: {
          userId,
          status: { in: ["ACTIVE", "TRIALING"] },
          OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: new Date() } }],
        },
        select: { productKey: true, currentPeriodEnd: true },
      }),
      EntitlementService.listActive(userId),
      CreditService.getWallet(userId),
    ]);

    if (!user) throw new ApiError(404, "User not found");
    const entitlementCurrent = entitlements.includes(ENTITLEMENT_KEYS.PORTFOLIO_PUBLISH);
    const hasAiCredits = entitlements.includes(ENTITLEMENT_KEYS.AI_CREDITS);
    const portfolioAccessEndsAt =
      activeSubscriptions
        .filter((item) => item.productKey === "portfolio_pro" || item.productKey === "bundle")
        .map((item) => item.currentPeriodEnd)
        .filter((value): value is Date => Boolean(value))
        .sort((left, right) => right.getTime() - left.getTime())[0] ?? null;
    const plan =
      entitlementCurrent && hasAiCredits
        ? "BUNDLE"
        : entitlementCurrent
          ? "PORTFOLIO_PRO"
          : hasAiCredits
            ? "AI_CREDITS"
            : "FREE";

    const now = new Date();
    const isExpired = Boolean(
      subscription?.currentPeriodEnd && subscription.currentPeriodEnd < now,
    );
    const resolvedStatus = isExpired ? "INACTIVE" : (subscription?.status ?? "INACTIVE");

    return {
      plan,
      productKey: subscription?.productKey ?? null,
      activeProductKeys: [...new Set(activeSubscriptions.map((item) => item.productKey))],
      status: resolvedStatus,
      interval: subscription?.interval ?? null,
      currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
      graceEndsAt: subscription?.graceEndsAt ?? null,
      canPublish: entitlementCurrent,
      eligibleForTrial: !subscription,
      accessEndsAt: portfolioAccessEndsAt,
      publicationStatus: entitlementCurrent
        ? "LIVE"
        : subscription?.graceEndsAt && subscription.graceEndsAt > new Date()
          ? "GRACE"
          : "SUSPENDED",
      entitlements,
      credits: wallet,
      catalog: publicCatalog(),
      creditEconomics: publicCreditEconomics(),
      addOns: entitlementCurrent
        ? [
            { key: "extra_credits", name: "Extra credit packs" },
            { key: "extra_publish_capacity", name: "Extra publish capacity" },
          ]
        : [],
    };
  }

  static async requirePublishAccess(userId: string) {
    return EntitlementService.require(
      userId,
      ENTITLEMENT_KEYS.PORTFOLIO_PUBLISH,
      "Publishing requires an active VeriWorkly Creator Pro subscription.",
    );
  }

  static async getHistory(userId: string) {
    const cached = await cacheGet<Awaited<ReturnType<typeof prisma.billingWebhookEvent.findMany>>>(
      billingHistoryCacheKey(userId),
    );
    if (cached) return cached;
    const result = await prisma.billingWebhookEvent.findMany({
      where: { userId, status: "PROCESSED" },
      select: { id: true, providerEventId: true, type: true, processedAt: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    await cacheSet(billingHistoryCacheKey(userId), result, BILLING_HISTORY_TTL_SECONDS);
    return result;
  }

  static async createCheckout(
    userId: string,
    productKey: ProductKey,
    interval: BillingIntervalInput,
    redirectUrl?: string,
  ) {
    const checkoutLockKey = `billing:checkout:${userId}`;
    const lockAcquired =
      (await getRedis().set(checkoutLockKey, `${productKey}:${interval}`, {
        NX: true,
        EX: CHECKOUT_LOCK_TTL_SECONDS,
      })) === "OK";
    if (!lockAcquired)
      throw new ApiError(
        409,
        "A billing checkout is already active. Complete it or try again soon.",
      );

    try {
      const productId = getProviderProductId(productKey, interval);

      if (!productCatalog[productKey].prices[interval])
        throw new ApiError(400, "That billing interval is not available for this product.");
      if (!productId) throw new ApiError(503, "The selected billing product is not configured.");

      // The "has this user subscribed before" lookup that used to sit here existed only
      // to decide trial eligibility. With no trials, it is a query per checkout for a
      // value nothing reads.
      const user = await prisma.user.findUnique({ where: { id: userId } });

      if (!user) throw new ApiError(404, "User not found");
      const activeProduct = await prisma.subscription.findFirst({
        where: {
          userId,
          productKey:
            productKey === "bundle"
              ? undefined
              : {
                  in: [productKey, "bundle"],
                },
          status: { in: ["ACTIVE", "TRIALING"] },
          OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: new Date() } }],
        },
        select: { id: true },
      });
      if (activeProduct) throw new ApiError(409, "You already have an active subscription.");

      const buildRedirectUrl = (base: string, callback?: string) => {
        if (!callback) return base;

        try {
          const url = new URL(base);
          url.searchParams.set("callbackURL", callback);

          return url.toString();
        } catch {
          const separator = base.includes("?") ? "&" : "?";

          return `${base}${separator}callbackURL=${encodeURIComponent(callback)}`;
        }
      };

      const checkout = await getDodoClient().checkoutSessions.create({
        product_cart: [{ product_id: productId, quantity: 1 }],
        customer: { email: user.email, name: user.name || "VeriWorkly User" },
        metadata: {
          veriworkly_user_id: userId,
          veriworkly_product: productKey,
          veriworkly_interval: interval,
        },
        // No trial on any plan. Creator Pro monthly previously received an automatic
        // 7-day trial on a first subscription; it was removed as a product decision.
        // Trials carry disclosure and reminder duties under several US state
        // auto-renewal statutes, and we would rather not offer one than offer one we
        // cannot service properly. Every plan now charges at checkout.
        return_url: buildRedirectUrl(config.dodo.checkoutReturnUrl, redirectUrl),
        cancel_url: buildRedirectUrl(config.dodo.checkoutCancelUrl, redirectUrl),
      });

      if (!checkout.checkout_url)
        throw new ApiError(502, "Billing provider did not return a checkout URL.");

      return { url: checkout.checkout_url };
    } catch (error) {
      await getRedis().del(checkoutLockKey);
      throw error;
    }
  }

  static async cancelCheckout(userId: string) {
    const checkoutLockKey = `billing:checkout:${userId}`;
    await getRedis().del(checkoutLockKey);
    return { success: true };
  }

  static async createPortal(userId: string) {
    const subscription = await this.getLatestSubscription(userId);

    if (!subscription?.providerCustomerId)
      throw new ApiError(409, "No billing account exists yet.");

    const portal = await getDodoClient().customers.customerPortal.create(
      subscription.providerCustomerId,
      { return_url: config.dodo.portalReturnUrl },
    );

    return { url: portal.link };
  }

  static async createCreditPackCheckout(
    userId: string,
    packKey: CreditPackKey,
    redirectUrl?: string,
  ) {
    const pack = creditPackCatalog[packKey];
    const productId = pack.providerProductId();
    if (!productId) throw new ApiError(503, "Extra credit checkout is not configured.");
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    if (!user) throw new ApiError(404, "User not found.");

    const appendCallback = (base: string) => {
      const url = new URL(base);
      if (redirectUrl) url.searchParams.set("callbackURL", redirectUrl);
      return url.toString();
    };
    const checkout = await getDodoClient().checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: { email: user.email, name: user.name || "VeriWorkly User" },
      metadata: { veriworkly_user_id: userId, veriworkly_product: packKey },
      return_url: appendCallback(config.dodo.checkoutReturnUrl),
      cancel_url: appendCallback(config.dodo.checkoutCancelUrl),
    });
    if (!checkout.checkout_url)
      throw new ApiError(502, "Billing provider did not return a checkout URL.");
    return { url: checkout.checkout_url };
  }

  static unwrapWebhook(body: string, headers: Record<string, string>) {
    if (!config.dodo.webhookSecret) {
      if (config.nodeEnv === "development") {
        try {
          return JSON.parse(body);
        } catch {
          throw new ApiError(400, "Invalid JSON body in development bypass.");
        }
      }

      throw new ApiError(503, "Billing webhook secret is not configured.");
    }

    return getDodoClient().webhooks.unwrap(body, { headers, key: config.dodo.webhookSecret });
  }

  static async processWebhook(
    providerEventId: string,
    event: ReturnType<typeof BillingService.unwrapWebhook>,
  ) {
    const parsedEvent = dodoWebhookEventSchema.parse(event);

    const lockKey = `billing:webhook:lock:${providerEventId}`;
    const lockAcquired =
      (await getRedis().set(lockKey, "1", { NX: true, EX: WEBHOOK_LOCK_TTL_SECONDS })) === "OK";

    if (!lockAcquired) {
      // A concurrent delivery of the same event is already processing it (webhook retry racing
      // the original, or the provider double-sending). Wait for it to finish rather than racing
      // applySubscriptionEvent/applyPaymentEvent in parallel.
      for (let attempt = 0; attempt < WEBHOOK_LOCK_WAIT_ATTEMPTS; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, WEBHOOK_LOCK_WAIT_MS));

        const existing = await prisma.billingWebhookEvent.findUnique({
          where: { providerEventId },
        });
        if (existing?.status === "PROCESSED") return { duplicate: true };
      }

      throw new ApiError(
        503,
        "This webhook event is already being processed by a concurrent request. Please retry.",
      );
    }

    try {
      let stored;

      try {
        stored = await prisma.billingWebhookEvent.create({
          data: {
            providerEventId,
            type: parsedEvent.type,
            payload: parsedEvent as unknown as Prisma.InputJsonValue,
            status: "PROCESSING",
            lastAttemptAt: new Date(),
          },
        });
      } catch (error) {
        if (
          error instanceof Error &&
          ((error as { code?: unknown }).code === "P2002" ||
            error.constructor.name === "PrismaClientKnownRequestError")
        ) {
          const existing = await prisma.billingWebhookEvent.findUnique({
            where: { providerEventId },
          });

          if (!existing) throw error;

          if (existing.status === "PROCESSED") return { duplicate: true };

          stored = await prisma.billingWebhookEvent.update({
            where: { id: existing.id },
            data: {
              status: "PROCESSING",
              retryCount: { increment: 1 },
              lastAttemptAt: new Date(),
            },
          });
        } else {
          throw error;
        }
      }

      try {
        if (parsedEvent.type.startsWith("subscription.")) {
          const subscriptionData = dodoSubscriptionSchema.parse(parsedEvent.data);
          const userId = await this.applySubscriptionEvent(
            subscriptionData,
            new Date(parsedEvent.timestamp),
          );
          await prisma.billingWebhookEvent.update({
            where: { id: stored.id },
            data: { userId },
          });
        }
        if (parsedEvent.type === "payment.succeeded") {
          const payment = dodoPaymentSchema.parse(parsedEvent.data);
          const userId = await this.applyPaymentEvent(payment);
          if (userId) {
            await prisma.billingWebhookEvent.update({ where: { id: stored.id }, data: { userId } });
          }
        }

        await prisma.billingWebhookEvent.update({
          where: { id: stored.id },
          data: { status: "PROCESSED", processedAt: new Date() },
        });

        return { duplicate: false };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const updatedEvent = await prisma.billingWebhookEvent.update({
          where: { id: stored.id },
          data: { status: "FAILED", error: errorMessage },
        });

        if (updatedEvent.retryCount >= 5) {
          logger.error(
            `CRITICAL: Webhook event ${providerEventId} exceeded max retries. Dead-letter alert!`,
            {
              providerEventId,
              error: errorMessage,
              retryCount: updatedEvent.retryCount,
            },
          );
        }

        throw error;
      }
    } finally {
      await getRedis()
        .del(lockKey)
        .catch((error) => logger.warn("Failed to release billing webhook lock", error));
    }
  }

  private static async applySubscriptionEvent(
    subscription: z.infer<typeof dodoSubscriptionSchema>,
    eventTime: Date,
  ) {
    const existing = await prisma.subscription.findUnique({
      where: { providerSubId: subscription.subscription_id },
    });

    const userId = subscription.metadata.veriworkly_user_id || existing?.userId;

    if (!userId)
      throw new ApiError(400, "Subscription webhook is missing VeriWorkly user metadata.");
    if (
      existing?.userId &&
      subscription.metadata.veriworkly_user_id &&
      existing.userId !== subscription.metadata.veriworkly_user_id
    )
      throw new ApiError(400, "Subscription webhook user metadata does not match its owner.");

    if (existing?.lastWebhookAt && existing.lastWebhookAt >= eventTime) return userId;

    const isNewSubscription = !existing;
    const previousStatus = existing?.status ?? null;

    const normalizedStatus = statusFromDodo(subscription.status);

    let productKey: ProductKey;
    let rawInterval: CatalogInterval;

    const metaProduct = subscription.metadata.veriworkly_product;
    const metaInterval = subscription.metadata.veriworkly_interval;

    if (metaProduct && isProductKey(metaProduct) && metaInterval) {
      productKey = metaProduct;
      rawInterval = metaInterval as CatalogInterval;
    } else {
      const product = getProductFromProviderId(subscription.product_id);
      if (!product) throw new ApiError(400, "Subscription webhook references an unknown product.");
      productKey = product.productKey;
      rawInterval = product.interval;
    }

    const interval =
      rawInterval === "one_day"
        ? ("ONE_DAY" as const)
        : rawInterval === "seven_day"
          ? ("SEVEN_DAY" as const)
          : rawInterval === "annual"
            ? ("ANNUAL" as const)
            : ("MONTHLY" as const);

    const pastDue = normalizedStatus === "PAST_DUE";
    const graceEndsAt = pastDue ? addDays(eventTime, config.portfolio.graceDays) : null;
    const currentPeriodEnd = subscription.next_billing_date
      ? new Date(subscription.next_billing_date)
      : rawInterval === "one_day"
        ? addDays(eventTime, 3)
        : rawInterval === "seven_day"
          ? addDays(eventTime, 7)
          : rawInterval === "annual"
            ? addYears(eventTime, 1)
            : addMonths(eventTime, 1);

    await prisma.$transaction(async (tx) => {
      const updateResult = await tx.subscription.updateMany({
        where: {
          providerSubId: subscription.subscription_id,
          OR: [{ lastWebhookAt: null }, { lastWebhookAt: { lt: eventTime } }],
        },
        data: {
          providerCustomerId: subscription.customer.customer_id,
          providerPriceId: subscription.product_id,
          productKey,
          interval,
          rawStatus: subscription.status,
          status: normalizedStatus,
          currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancel_at_next_billing_date,
          graceEndsAt,
          lastWebhookAt: eventTime,
        },
      });

      if (updateResult.count === 0) {
        const currentSub = await tx.subscription.findUnique({
          where: { providerSubId: subscription.subscription_id },
          select: { id: true, lastWebhookAt: true },
        });

        if (currentSub) return;

        await tx.subscription.create({
          data: {
            userId,
            provider: "dodo",
            providerCustomerId: subscription.customer.customer_id,
            providerPriceId: subscription.product_id,
            providerSubId: subscription.subscription_id,
            productKey,
            interval,
            rawStatus: subscription.status,
            status: normalizedStatus,
            currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancel_at_next_billing_date,
            graceEndsAt,
            lastWebhookAt: eventTime,
          },
        });
      }

      const access = accessStatus({ status: normalizedStatus, currentPeriodEnd, graceEndsAt });
      await tx.entitlementGrant.updateMany({
        where: { userId, source: "SUBSCRIPTION", sourceId: subscription.subscription_id },
        data: { revokedAt: eventTime },
      });

      if (access.canPublish) {
        for (const key of productCatalog[productKey].entitlements) {
          await tx.entitlementGrant.upsert({
            where: {
              userId_key_source_sourceId: {
                userId,
                key,
                source: "SUBSCRIPTION",
                sourceId: subscription.subscription_id,
              },
            },
            create: {
              userId,
              key,
              source: "SUBSCRIPTION",
              sourceId: subscription.subscription_id,
              startsAt: eventTime,
              endsAt: currentPeriodEnd,
              metadata: { productKey },
            },
            update: {
              startsAt: eventTime,
              endsAt: currentPeriodEnd,
              revokedAt: null,
              metadata: { productKey },
            },
          });
        }
      }

      const effectivePublishGrant = await tx.entitlementGrant.findFirst({
        where: {
          userId,
          key: ENTITLEMENT_KEYS.PORTFOLIO_PUBLISH,
          startsAt: { lte: eventTime },
          revokedAt: null,
          OR: [{ endsAt: null }, { endsAt: { gt: eventTime } }],
        },
        select: { endsAt: true },
        orderBy: { endsAt: "desc" },
      });
      const canPublish = Boolean(effectivePublishGrant);
      const publicationStatus = canPublish ? "LIVE" : access.publicationStatus;
      await tx.portfolioPublication.updateMany({
        where: { userId },
        data:
          publicationStatus === "SUSPENDED"
            ? { status: "SUSPENDED", suspensionReason: normalizedStatus, suspendedAt: new Date() }
            : { status: publicationStatus, suspensionReason: null, suspendedAt: null },
      });
    }, BILLING_TRANSACTION_OPTIONS);

    const publication = await prisma.portfolioPublication.findUnique({
      where: { userId },
      select: { subdomain: true },
    });

    if (publication) {
      await invalidatePublicPortfolioCaches([publication.subdomain]);
      void revalidatePublicPortfolios([publication.subdomain]);
    }

    await cacheDel(userProfileCacheKey(userId));
    await Promise.all([
      cacheDel(billingSummaryCacheKey(userId)),
      cacheDel(billingHistoryCacheKey(userId)),
      ApiKeyService.invalidateAuthCacheForUser(userId),
    ]);

    if (isNewSubscription && (normalizedStatus === "ACTIVE" || normalizedStatus === "TRIALING")) {
      void this.notifySubscriptionPurchased(userId, productKey);
    } else if (previousStatus && previousStatus !== "CANCELED" && normalizedStatus === "CANCELED") {
      void this.notifySubscriptionCancelled(userId);
    }

    return userId;
  }

  private static async notifySubscriptionPurchased(userId: string, productKey: ProductKey) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });
      if (!user?.email) return;

      await sendSubscriptionPurchasedEmail(
        user.email,
        user.name || "there",
        productCatalog[productKey].name,
      );
    } catch (error) {
      logger.warn("Failed to send subscription purchased email", error);
    }
  }

  private static async notifySubscriptionCancelled(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });
      if (!user?.email) return;

      await sendSubscriptionCancelledEmail(user.email, user.name || "there");
    } catch (error) {
      logger.warn("Failed to send subscription cancelled email", error);
    }
  }

  private static async applyPaymentEvent(payment: z.infer<typeof dodoPaymentSchema>) {
    const subscription = payment.subscription_id
      ? await prisma.subscription.findUnique({
          where: { providerSubId: payment.subscription_id },
          select: { userId: true, productKey: true, interval: true, currentPeriodEnd: true },
        })
      : null;
    const userId = payment.metadata.veriworkly_user_id || subscription?.userId;
    if (!userId) return null;
    if (payment.settlement_currency.toUpperCase() !== "USD") {
      logger.warn(
        `Payment ${payment.payment_id} for user ${userId} settled in non-USD currency ` +
          `(${payment.settlement_currency}); skipping credit/entitlement grant since only USD is supported.`,
      );
      return userId;
    }

    const purchasedProduct = payment.metadata.veriworkly_product;
    if (purchasedProduct && isCreditPackKey(purchasedProduct)) {
      const pack = creditPackCatalog[purchasedProduct];
      await CreditService.grant(userId, pack.credits, {
        requestId: `payment-credit:${payment.payment_id}`,
        source: "credit_pack",
        sourceId: payment.payment_id,
        expiresAt: addDays(new Date(), pack.expiresInDays),
        reason: pack.name,
      });
    } else {
      let productKey: ProductKey | null =
        subscription?.productKey && isProductKey(subscription.productKey)
          ? subscription.productKey
          : null;
      let intervalInput: CatalogInterval | null = null;
      let expiresAt: Date | null = subscription?.currentPeriodEnd ?? null;

      if (subscription) {
        intervalInput =
          subscription.interval === "ANNUAL"
            ? "annual"
            : subscription.interval === "ONE_DAY"
              ? "one_day"
              : subscription.interval === "SEVEN_DAY"
                ? "seven_day"
                : "monthly";
      } else {
        const metaProduct = payment.metadata.veriworkly_product;
        const metaInterval = payment.metadata.veriworkly_interval;
        if (metaProduct && isProductKey(metaProduct) && metaInterval) {
          productKey = metaProduct;
          intervalInput = metaInterval as CatalogInterval;
          const now = new Date();
          expiresAt =
            intervalInput === "one_day"
              ? addDays(now, 3)
              : intervalInput === "seven_day"
                ? addDays(now, 7)
                : intervalInput === "annual"
                  ? addYears(now, 1)
                  : addMonths(now, 1);
        }
      }

      if (productKey && (productKey === "ai_credits" || productKey === "bundle") && intervalInput) {
        const allowance = productCatalog[productKey].creditAllowance?.[intervalInput] ?? 0;
        if (allowance > 0) {
          await CreditService.grant(userId, allowance, {
            requestId: `subscription-credit:${payment.payment_id}`,
            source: "subscription_payment",
            sourceId: payment.payment_id,
            expiresAt,
            reason: `${productCatalog[productKey].name} credit allowance`,
          });
        }
      }
    }

    try {
      await AffiliateService.createCommission({
        referredUserId: userId,
        subscriptionId: payment.subscription_id ?? undefined,
        providerPaymentId: payment.payment_id,
        purchaseAmountCents: payment.settlement_amount,
        status: "PENDING",
        reason: "Dodo payment succeeded",
      });
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 404) {
        await cacheDel(billingHistoryCacheKey(userId));
        return userId;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
        return userId;
      throw error;
    }

    await cacheDel(billingHistoryCacheKey(userId));
    return userId;
  }
}
