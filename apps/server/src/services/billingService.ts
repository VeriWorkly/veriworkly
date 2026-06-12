import { z } from "zod";
import DodoPayments from "dodopayments";

import { Prisma, type Subscription as PrismaSubscription } from "@prisma/client";

import { config } from "#config";

import {
  dodoPaymentSchema,
  dodoWebhookEventSchema,
  dodoSubscriptionSchema,
} from "#validators/billingValidator";

import { prisma } from "#utils/prisma";
import { logger } from "#utils/logger";
import { ApiError } from "#utils/errors";
import { cacheDel, cacheGet, cacheSet, getRedis } from "#utils/redis";
import { EntitlementService } from "#services/entitlementService";
import { AffiliateService } from "#services/affiliateService";
import { CreditService } from "#services/creditService";
import {
  creditPackCatalog,
  ENTITLEMENT_KEYS,
  getProductFromProviderId,
  getProviderProductId,
  productCatalog,
  publicCatalog,
  publicCreditEconomics,
  type CreditPackKey,
  type ProductKey,
} from "#services/productCatalog";
import {
  revalidatePublicPortfolios,
  invalidatePublicPortfolioCaches,
} from "#utils/portfolioPublicationCache";

type BillingIntervalInput = "seven_day" | "monthly" | "annual";
const BILLING_SUMMARY_TTL_SECONDS = 60;
const BILLING_HISTORY_TTL_SECONDS = 60;
const CHECKOUT_LOCK_TTL_SECONDS = 600;

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

function statusFromDodo(rawStatus: string) {
  switch (rawStatus) {
    case "active":
      return "ACTIVE" as const;
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
        select: {
          portfolioPlan: true,
          portfolioCanPublish: true,
          portfolioAccessEndsAt: true,
        },
      }),
      this.getLatestSubscription(userId),
      prisma.subscription.findMany({
        where: {
          userId,
          status: { in: ["ACTIVE", "TRIALING"] },
          OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: new Date() } }],
        },
        select: { productKey: true },
      }),
      EntitlementService.listActive(userId),
      CreditService.getWallet(userId),
    ]);

    if (!user) throw new ApiError(404, "User not found");
    const entitlementCurrent =
      entitlements.includes(ENTITLEMENT_KEYS.PORTFOLIO_PUBLISH) ||
      (user.portfolioCanPublish &&
        (!user.portfolioAccessEndsAt || user.portfolioAccessEndsAt > new Date()));
    const hasAiCredits = entitlements.includes(ENTITLEMENT_KEYS.AI_CREDITS);
    const plan =
      entitlementCurrent && hasAiCredits
        ? "BUNDLE"
        : entitlementCurrent
          ? "PORTFOLIO_PRO"
          : hasAiCredits
            ? "AI_CREDITS"
            : "FREE";

    return {
      plan,
      productKey: subscription?.productKey ?? null,
      activeProductKeys: [...new Set(activeSubscriptions.map((item) => item.productKey))],
      status: subscription?.status ?? "INACTIVE",
      interval: subscription?.interval ?? null,
      currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
      graceEndsAt: subscription?.graceEndsAt ?? null,
      canPublish: entitlementCurrent,
      eligibleForTrial: !subscription,
      accessEndsAt: user.portfolioAccessEndsAt,
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
    if (await EntitlementService.has(userId, ENTITLEMENT_KEYS.PORTFOLIO_PUBLISH)) return;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { portfolioCanPublish: true, portfolioAccessEndsAt: true },
    });

    if (
      !user?.portfolioCanPublish ||
      (user.portfolioAccessEndsAt && user.portfolioAccessEndsAt <= new Date())
    )
      throw new ApiError(
        402,
        "Publishing requires an active VeriWorkly Portfolio Pro subscription.",
      );

    return user;
  }

  static async getHistory(userId: string) {
    const cached = await cacheGet<
      Awaited<ReturnType<typeof prisma.billingWebhookEvent.findMany>>
    >(billingHistoryCacheKey(userId));
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

      const [user, previousSubscription] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId } }),
        prisma.subscription.findFirst({ where: { userId }, select: { id: true } }),
      ]);

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
        metadata: { veriworkly_user_id: userId, veriworkly_product: productKey },
        ...(productKey === "portfolio_pro" && interval === "monthly" && !previousSubscription
          ? { subscription_data: { trial_period_days: 7 } }
          : {}),
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
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
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

    const normalizedStatus = statusFromDodo(subscription.status);
    const product = getProductFromProviderId(subscription.product_id);
    if (!product) throw new ApiError(400, "Subscription webhook references an unknown product.");
    const interval =
      product.interval === "seven_day"
        ? ("SEVEN_DAY" as const)
        : product.interval === "annual"
          ? ("ANNUAL" as const)
          : ("MONTHLY" as const);
    const pastDue = normalizedStatus === "PAST_DUE";
    const graceEndsAt = pastDue ? addDays(eventTime, config.portfolio.graceDays) : null;
    const currentPeriodEnd = subscription.next_billing_date
      ? new Date(subscription.next_billing_date)
      : null;

    await prisma.$transaction(async (tx) => {
      const updateResult = await tx.subscription.updateMany({
        where: {
          providerSubId: subscription.subscription_id,
          OR: [{ lastWebhookAt: null }, { lastWebhookAt: { lt: eventTime } }],
        },
        data: {
          providerCustomerId: subscription.customer.customer_id,
          providerPriceId: subscription.product_id,
          productKey: product.productKey,
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
            productKey: product.productKey,
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
        for (const key of productCatalog[product.productKey].entitlements) {
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
              metadata: { productKey: product.productKey },
            },
            update: {
              startsAt: eventTime,
              endsAt: currentPeriodEnd,
              revokedAt: null,
              metadata: { productKey: product.productKey },
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
      await tx.user.update({
        where: { id: userId },
        data: {
          portfolioPlan: canPublish ? "PORTFOLIO_PRO" : "FREE",
          portfolioCanPublish: canPublish,
          portfolioAccessEndsAt: canPublish ? effectivePublishGrant?.endsAt : graceEndsAt,
        },
      });
      await tx.portfolioPublication.updateMany({
        where: { userId },
        data:
          publicationStatus === "SUSPENDED"
            ? { status: "SUSPENDED", suspensionReason: normalizedStatus, suspendedAt: new Date() }
            : { status: publicationStatus, suspensionReason: null, suspendedAt: null },
      });
    });

    const publication = await prisma.portfolioPublication.findUnique({
      where: { userId },
      select: { subdomain: true },
    });

    if (publication) {
      await invalidatePublicPortfolioCaches([publication.subdomain]);
      void revalidatePublicPortfolios([publication.subdomain]);
    }

    await cacheDel(`user:profile:v2:${userId}`);
    await Promise.all([
      cacheDel(billingSummaryCacheKey(userId)),
      cacheDel(billingHistoryCacheKey(userId)),
    ]);
    return userId;
  }

  private static async applyPaymentEvent(payment: z.infer<typeof dodoPaymentSchema>) {
    const subscription = payment.subscription_id
      ? await prisma.subscription.findUnique({
          where: { providerSubId: payment.subscription_id },
          select: { userId: true, productKey: true, interval: true, currentPeriodEnd: true },
        })
      : null;
    const userId = payment.metadata.veriworkly_user_id || subscription?.userId;
    if (!userId || payment.settlement_currency.toUpperCase() !== "USD") return userId ?? null;

    const purchasedProduct = payment.metadata.veriworkly_product;
    if (purchasedProduct === "credit_pack_100") {
      const pack = creditPackCatalog.credit_pack_100;
      await CreditService.grant(userId, pack.credits, {
        requestId: `payment-credit:${payment.payment_id}`,
        source: "credit_pack",
        sourceId: payment.payment_id,
        expiresAt: addDays(new Date(), pack.expiresInDays),
        reason: pack.name,
      });
    } else if (
      subscription &&
      (subscription.productKey === "ai_credits" || subscription.productKey === "bundle")
    ) {
      const interval =
        subscription.interval === "ANNUAL"
          ? "annual"
          : subscription.interval === "SEVEN_DAY"
            ? "seven_day"
            : "monthly";
      const allowance = productCatalog[subscription.productKey].creditAllowance?.[interval] ?? 0;
      if (allowance > 0) {
        await CreditService.grant(userId, allowance, {
          requestId: `subscription-credit:${payment.payment_id}`,
          source: "subscription_payment",
          sourceId: payment.payment_id,
          expiresAt: subscription.currentPeriodEnd,
          reason: `${productCatalog[subscription.productKey].name} credit allowance`,
        });
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
