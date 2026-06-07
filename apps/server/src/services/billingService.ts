import { z } from "zod";
import DodoPayments from "dodopayments";

import { Prisma, type Subscription as PrismaSubscription } from "@prisma/client";

import { config } from "#config";

import { dodoWebhookEventSchema, dodoSubscriptionSchema } from "#validators/billingValidator";

import { prisma } from "#utils/prisma";
import { logger } from "#utils/logger";
import { ApiError } from "#utils/errors";
import { cacheDel, getRedis } from "#utils/redis";
import {
  revalidatePublicPortfolios,
  invalidatePublicPortfolioCaches,
} from "#utils/portfolioPublicationCache";

type BillingIntervalInput = "seven_day" | "monthly" | "annual";

function getDodoClient() {
  if (!config.dodo.apiKey) throw new ApiError(503, "Portfolio billing is not configured.");

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

function intervalFromProduct(productId: string) {
  if (productId === config.dodo.sevenDayProductId) return "SEVEN_DAY" as const;
  if (productId === config.dodo.annualProductId) return "ANNUAL" as const;
  if (productId === config.dodo.monthlyProductId) return "MONTHLY" as const;

  return null;
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
    const [user, subscription] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          portfolioPlan: true,
          portfolioCanPublish: true,
          portfolioAccessEndsAt: true,
        },
      }),
      this.getLatestSubscription(userId),
    ]);

    if (!user) throw new ApiError(404, "User not found");
    const entitlementCurrent =
      user.portfolioCanPublish &&
      (!user.portfolioAccessEndsAt || user.portfolioAccessEndsAt > new Date());

    return {
      plan: user.portfolioPlan,
      status: subscription?.status ?? "INACTIVE",
      interval: subscription?.interval ?? null,
      currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
      graceEndsAt: subscription?.graceEndsAt ?? null,
      canPublish: entitlementCurrent,
      eligibleForTrial: !subscription,
      accessEndsAt: user.portfolioAccessEndsAt,
      publicationStatus: accessStatus(subscription).publicationStatus,
      pricing: { sevenDay: 4, monthly: 12, annual: 120, currency: "USD" },
    };
  }

  static async requirePublishAccess(userId: string) {
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
    return prisma.billingWebhookEvent.findMany({
      where: { userId, status: "PROCESSED" },
      select: { id: true, providerEventId: true, type: true, processedAt: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  static async createCheckout(
    userId: string,
    interval: BillingIntervalInput,
    redirectUrl?: string,
  ) {
    const checkoutLockKey = `billing:checkout:${userId}`;
    const lockAcquired =
      (await getRedis().set(checkoutLockKey, interval, { NX: true, EX: 600 })) === "OK";
    if (!lockAcquired)
      throw new ApiError(
        409,
        "A billing checkout is already active. Complete it or try again soon.",
      );

    try {
      const productId =
        interval === "annual"
          ? config.dodo.annualProductId
          : interval === "seven_day"
            ? config.dodo.sevenDayProductId
            : config.dodo.monthlyProductId;

      if (!productId) throw new ApiError(503, "Portfolio billing product is not configured.");

      const [user, previousSubscription] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId } }),
        prisma.subscription.findFirst({ where: { userId }, select: { id: true } }),
      ]);

      if (!user) throw new ApiError(404, "User not found");
      if (
        user.portfolioCanPublish &&
        (!user.portfolioAccessEndsAt || user.portfolioAccessEndsAt > new Date())
      )
        throw new ApiError(409, "You already have an active Portfolio Pro subscription.");

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
        metadata: { veriworkly_user_id: userId, veriworkly_product: "portfolio_pro" },
        ...(interval === "monthly" && !previousSubscription
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
    const interval = intervalFromProduct(subscription.product_id);
    if (!interval) throw new ApiError(400, "Subscription webhook references an unknown product.");
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
      await tx.user.update({
        where: { id: userId },
        data: {
          portfolioPlan: access.canPublish ? "PORTFOLIO_PRO" : "FREE",
          portfolioCanPublish: access.canPublish,
          portfolioAccessEndsAt: access.canPublish ? currentPeriodEnd : graceEndsAt,
        },
      });
      await tx.portfolioPublication.updateMany({
        where: { userId },
        data:
          access.publicationStatus === "SUSPENDED"
            ? { status: "SUSPENDED", suspensionReason: normalizedStatus, suspendedAt: new Date() }
            : { status: access.publicationStatus, suspensionReason: null, suspendedAt: null },
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
    return userId;
  }
}
