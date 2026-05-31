import { z } from "zod";

const webUrlSchema = z
  .string()
  .trim()
  .url()
  .max(2048)
  .refine((value) => /^https?:\/\//i.test(value), "Use an HTTP or HTTPS URL.");

const assetReferenceSchema = z.object({
  id: z.string().min(1).max(128),
  url: webUrlSchema,
});

const linkSchema = z.object({
  id: z.string().min(1).max(128),
  label: z.string().trim().min(1).max(80),
  url: webUrlSchema,
});

const sectionTypeSchema = z.enum([
  "projects",
  "experience",
  "services",
  "skills",
  "education",
  "writing",
  "testimonials",
  "awards",
  "contact",
]);

export const portfolioContentSchema = z.object({
  schemaVersion: z.literal(1),

  templateId: z.enum(["signal", "atelier"]),

  identity: z.object({
    name: z.string().trim().min(1).max(120),
    headline: z.string().trim().min(1).max(240),
    bio: z.string().trim().min(1).max(1600),
    location: z.string().trim().max(120),
    email: z.string().trim().email().max(254),
    availability: z.string().trim().max(160),
    avatar: assetReferenceSchema.nullable(),
  }),

  seo: z.object({
    title: z.string().trim().max(120),
    description: z.string().trim().max(300),
    socialImage: assetReferenceSchema.nullable(),
  }),

  socialLinks: z.array(linkSchema).max(12),

  sections: z
    .array(
      z.object({
        id: z.string().min(1).max(128),
        type: sectionTypeSchema,
        title: z.string().trim().min(1).max(120),
        visible: z.boolean(),
        items: z.array(z.record(z.unknown())).max(24),
      }),
    )
    .max(24),
});

export const portfolioDraftContentSchema = portfolioContentSchema.extend({
  identity: portfolioContentSchema.shape.identity.extend({
    name: z.string().trim().max(120),
    headline: z.string().trim().max(240),
    bio: z.string().trim().max(1600),
    email: z.union([z.literal(""), z.string().trim().email().max(254)]),
  }),

  socialLinks: z
    .array(
      linkSchema.extend({
        label: z.string().trim().max(80),
        url: z.union([z.literal(""), webUrlSchema]),
      }),
    )
    .max(12),

  sections: z
    .array(
      portfolioContentSchema.shape.sections.element.extend({
        title: z.string().trim().max(120),
      }),
    )
    .max(24),
});

export const portfolioSaveDraftSchema = z.object({
  documentId: z.string().min(1).optional(),
  subdomain: z.string().trim().min(1).max(63),
  revision: z.number().int().min(1).optional(),
  snapshot: portfolioDraftContentSchema,
});

export const portfolioPublishSchema = z.object({
  documentId: z.string().min(1),
  subdomain: z.string().trim().min(1).max(63),
  revision: z.number().int().min(1),
});

export const portfolioSubdomainParamsSchema = z.object({
  slug: z.string().trim().min(1).max(63),
});

export type PortfolioContentInput = z.infer<typeof portfolioDraftContentSchema>;
