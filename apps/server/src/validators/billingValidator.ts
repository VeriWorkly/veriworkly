import { z } from "zod";

/**
 * A same-site path to return to after checkout. Browsers read a backslash as a slash, so
 * "/\evil.com" is the protocol-relative "//evil.com": no backslash or whitespace anywhere, and no
 * second leading slash.
 */
const RELATIVE_REDIRECT = /^\/(?!\/)[^\\\s]*$/;

export const checkoutSchema = z.object({
  productKey: z.enum(["ai_credits", "portfolio_pro", "bundle"]).default("portfolio_pro"),
  interval: z.enum(["one_day", "seven_day", "monthly", "annual"]),
  redirectUrl: z
    .string()
    .trim()
    .regex(RELATIVE_REDIRECT, "Redirect URL must be a relative path")
    .optional(),
});

/**
 * A plan change on the customer's live subscription (V-202). Only recurring intervals: a pass is
 * not a subscription. Which changes are allowed (upgrades to the bundle at the same interval) is
 * the service's decision, so a downgrade gets a coded 409 rather than a validation error.
 */
export const planChangeSchema = z.object({
  productKey: z.enum(["ai_credits", "portfolio_pro", "bundle"]),
  interval: z.enum(["monthly", "annual"]),
  /** Body alternative to the `Idempotency-Key` header; the header wins when both are sent. */
  idempotencyKey: z.string().trim().min(1).max(128).optional(),
});

export const creditPackCheckoutSchema = z.object({
  packKey: z.enum(["credit_pack_250", "credit_pack_500"]),
  redirectUrl: z
    .string()
    .trim()
    .regex(RELATIVE_REDIRECT, "Redirect URL must be a relative path")
    .optional(),
});

export const dodoWebhookHeaderSchema = z.object({
  "webhook-id": z.string().trim().min(1, "Webhook ID is required"),
});

export const dodoSubscriptionSchema = z.object({
  subscription_id: z.string().trim().min(1, "Subscription ID is required"),
  customer: z.object({
    customer_id: z.string().trim().min(1, "Customer ID is required"),
  }),
  product_id: z.string().trim().min(1, "Product ID is required"),
  status: z.string().trim().min(1, "Status is required"),
  cancel_at_next_billing_date: z.boolean(),
  next_billing_date: z.string().trim().nullable().optional(),
  // Start of the period being billed: anchors the credit schedule a mid-cycle plan change opens.
  previous_billing_date: z.string().trim().nullable().optional(),
  // When the provider created the subscription: tells a late event about an older subscription
  // apart from one about the checkout that is open now.
  created_at: z.string().trim().nullable().optional(),
  // The plan's price, for the purchase confirmation (V-177). Pre-tax unless `tax_inclusive`.
  recurring_pre_tax_amount: z.number().int().nonnegative().nullable().optional(),
  currency: z.string().trim().min(1).nullable().optional(),
  tax_inclusive: z.boolean().nullable().optional(),
  metadata: z
    .object({
      veriworkly_user_id: z.string().trim().optional(),
      veriworkly_product: z.string().trim().optional(),
      veriworkly_interval: z.string().trim().optional(),
    })
    .catchall(z.any())
    .default({}),
});

export const dodoWebhookEventSchema = z.object({
  type: z.string().trim().min(1, "Event type is required"),
  timestamp: z.string().trim().datetime("Invalid event timestamp"),
  data: z.unknown(),
});

/**
 * Only the fields the webhook handler reads are typed; everything else Dodo sends passes through
 * untouched (the whole event is stored as the audit payload). `total_amount` and
 * `is_update_payment_method` decide whether a payment earns the renewal credit allowance: a
 * card-update charge is a zero-amount `payment.succeeded` and must not mint credits (V-141).
 */
export const dodoPaymentSchema = z
  .object({
    payment_id: z.string().trim().min(1),
    subscription_id: z.string().trim().nullable().optional(),
    product_id: z.string().trim().nullable().optional(),
    product_cart: z
      .array(z.object({ product_id: z.string().trim().min(1) }).passthrough())
      .nullable()
      .optional(),
    total_amount: z.number().int().nonnegative().optional(),
    settlement_amount: z.number().int().nonnegative(),
    settlement_currency: z.string().trim().min(1),
    settlement_tax: z.number().int().nonnegative().nullable().optional(),
    tax: z.number().int().nonnegative().nullable().optional(),
    currency: z.string().trim().min(1).optional(),
    is_update_payment_method: z.boolean().optional().default(false),
    // Set when the payment was made through a checkout session; matches the open checkout record.
    checkout_session_id: z.string().trim().nullable().optional(),
    // "plan_change" marks the prorated charge of a plan change, portal-initiated ones included (V-202).
    charge_type: z.string().trim().nullable().optional(),
    created_at: z.string().trim().nullable().optional(),
    // Recorded on the user so a one-time buyer can open the billing portal (V-175).
    customer: z
      .object({ customer_id: z.string().trim().min(1) })
      .passthrough()
      .nullable()
      .optional(),
    service_periods: z
      .array(
        z
          .object({
            subscription_id: z.string().trim().min(1),
            starts_at: z.string().trim().min(1),
            ends_at: z.string().trim().min(1),
          })
          .passthrough(),
      )
      .nullable()
      .optional(),
    metadata: z.record(z.string(), z.string()).default({}),
  })
  .passthrough();
