import "server-only";

// Single source of truth for "is this user an admin" on the site app (used to let the admin
// bypass the production payments gate). Server-only and deliberately fails closed: if
// ADMIN_EMAIL isn't configured, nobody is treated as an admin. Mirrors apps/portfolio/lib/admin.ts
// and apps/studio/lib/feature-flags.ts's admin checks - never ship the admin's email itself to
// the client, only the resulting boolean.

export function isAdminUser(user: { email?: string | null } | null | undefined): boolean {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  if (!adminEmail || !user?.email) return false;

  return user.email.trim().toLowerCase() === adminEmail;
}
