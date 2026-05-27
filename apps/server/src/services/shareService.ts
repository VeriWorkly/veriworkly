import { promisify } from "node:util";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

import { Prisma } from "@prisma/client";

import { prisma } from "#utils/prisma";
import { ApiError } from "#utils/errors";
import { normalizeSlug, normalizeUsername } from "#utils/slugs";

import { UserService } from "#services/userService";

const scryptAsync = promisify(scrypt);

export class ShareService {
  static async hashPassword(password: string) {
    const salt = randomBytes(16).toString("hex");
    const derived = (await scryptAsync(password, salt, 64)) as Buffer;

    return `${salt}:${derived.toString("hex")}`;
  }

  static async verifyPassword(password: string, hash: string) {
    const [salt, stored] = hash.split(":");

    if (!salt || !stored) return false;

    const derived = (await scryptAsync(password, salt, 64)) as Buffer;
    const right = Buffer.from(stored, "hex");

    if (derived.length !== right.length) return false;

    return timingSafeEqual(derived, right);
  }

  static isExpired(expiresAt: Date | null | string) {
    if (!expiresAt) return false;

    return new Date(expiresAt).getTime() <= Date.now();
  }

  static async recordShareView(shareLinkId: string, ipAddress?: string, userAgent?: string | null) {
    return prisma.shareLink.update({
      where: { id: shareLinkId },
      data: {
        viewCount: { increment: 1 },
        lastViewedAt: new Date(),
        views: {
          create: {
            ipAddress,
            userAgent: userAgent ?? null,
          },
        },
      },
    });
  }

  static async createShareLink(
    userId: string,
    documentId: string,
    data: {
      password?: string;
      noExpiry?: boolean;
      expiresAt?: string | Date | null;
      updateSlug?: boolean;
      removePassword?: boolean;
      snapshot: Prisma.InputJsonValue;
    },
  ) {
    const username = await UserService.requireUsernameForUser(userId);
    const document = await prisma.document.findFirst({
      where: { id: documentId, userId, deletedAt: null },
      select: { id: true, slug: true },
    });

    if (!document) throw new ApiError(404, "Document not found");

    const existing = await prisma.shareLink.findUnique({
      where: { userId_documentId: { userId, documentId } },
      select: { id: true, slug: true, passwordHash: true },
    });

    const slug =
      existing && !data.updateSlug
        ? existing.slug
        : await this.buildUniqueShareSlug(userId, document.slug, existing?.id);

    let passwordHash = existing ? existing.passwordHash : null;

    if (data.removePassword) {
      passwordHash = null;
    } else if (data.password) {
      passwordHash = await this.hashPassword(data.password);
    }

    const expiresAt = data.noExpiry ? null : data.expiresAt ? new Date(data.expiresAt) : null;

    const shareLink = existing
      ? await prisma.shareLink.update({
          where: { id: existing.id },
          data: {
            slug,
            snapshot: data.snapshot,
            passwordHash,
            expiresAt,
          },
        })
      : await prisma.shareLink.create({
          data: {
            userId,
            documentId,
            slug,
            snapshot: data.snapshot,
            passwordHash,
            expiresAt,
          },
        });

    return {
      shareLink: {
        ...shareLink,
        token: shareLink.slug,
        username,
        documentSlug: document.slug,
        publicPath: `/${username}/${shareLink.slug}`,
      },
      previousSlug: existing?.slug,
    };
  }

  static async listShareLinks(userId: string, documentId: string) {
    return this.listShareLinksPaginated(userId, documentId);
  }

  static async listSharedDocumentIds(userId: string, documentIds: string[]) {
    const uniqueDocumentIds = [...new Set(documentIds.filter(Boolean))];

    if (uniqueDocumentIds.length === 0) return [];

    const links = await prisma.shareLink.findMany({
      where: {
        userId,
        documentId: { in: uniqueDocumentIds },
        document: { deletedAt: null },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { documentId: true },
    });

    return [...new Set(links.map((link) => link.documentId))];
  }

  static async listShareLinksPaginated(
    userId: string,
    documentId: string,
    query?: { limit: number; offset: number },
  ) {
    void query;

    const item = await prisma.shareLink.findUnique({
      where: { userId_documentId: { userId, documentId } },
    });

    const username = await UserService.requireUsernameForUser(userId);

    const items = item
      ? [
          {
            ...item,
            token: item.slug,
            username,
          },
        ]
      : [];

    return { items, total: items.length };
  }

  static async revokeShareLink(userId: string, documentId: string, shareLinkId: string) {
    const username = await UserService.requireUsernameForUser(userId);

    const existing = await prisma.shareLink.findFirst({
      where: { id: shareLinkId, userId, documentId },
      select: { id: true, slug: true },
    });

    if (!existing) throw new ApiError(404, "Share link not found");

    await prisma.shareLink.delete({ where: { id: shareLinkId } });

    return { username, slug: existing.slug };
  }

  static async getPublicShareLinkByUsernameAndSlug(username: string, slug: string) {
    const user = await prisma.user.findUnique({
      where: { username: normalizeUsername(username) },
      select: { id: true },
    });

    if (!user) throw new ApiError(404, "Link not found");

    const shareLink = await prisma.shareLink.findFirst({
      where: {
        userId: user.id,
        slug: normalizeSlug(slug),
        document: {
          deletedAt: null,
        },
      },
      include: { document: { select: { title: true, slug: true } } },
      orderBy: { createdAt: "desc" },
    });

    if (!shareLink) throw new ApiError(404, "Link not found");
    if (this.isExpired(shareLink.expiresAt)) throw new ApiError(410, "Link expired");

    return shareLink;
  }

  private static async buildUniqueShareSlug(userId: string, slug: string, shareLinkId?: string) {
    const base = normalizeSlug(slug);

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const suffix = attempt === 0 ? "" : `-${attempt + 1}`;
      const candidate = `${base.slice(0, 255 - suffix.length)}${suffix}`;

      const existing = await prisma.shareLink.findFirst({
        where: {
          userId,
          slug: candidate,
          ...(shareLinkId ? { id: { not: shareLinkId } } : {}),
        },
        select: { id: true },
      });

      if (!existing) return candidate;
    }

    return `${base.slice(0, 246)}-${Date.now().toString(36)}`;
  }
}
