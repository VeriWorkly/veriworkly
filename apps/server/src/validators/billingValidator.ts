import { z } from "zod";

export const checkoutSchema = z.object({
  interval: z.enum(["monthly", "annual"]),
  redirectUrl: z
    .string()
    .trim()
    .regex(/^\/(?!\/)/, "Redirect URL must be a relative path")
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
  metadata: z
    .object({
      veriworkly_user_id: z.string().trim().optional(),
    })
    .catchall(z.any())
    .default({}),
});

export const dodoWebhookEventSchema = z.object({
  type: z.string().trim().min(1, "Event type is required"),
  timestamp: z.string().trim().datetime("Invalid event timestamp"),
  data: z.unknown(),
});
