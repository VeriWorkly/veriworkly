import { promisify } from "node:util";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

import { Prisma } from "@prisma/client";
import { prisma } from "#utils/prisma";
import { ApiError } from "#utils/errors";

const scryptAsync = promisify(scrypt);

export class ShareService {
  /**
   * Hash a password using scrypt
   * @param password Plaintext password
   */

  static async hashPassword(password: string) {
    const salt = randomBytes(16).toString("hex");
    const derived = (await scryptAsync(password, salt, 64)) as Buffer;

    return `${salt}:${derived.toString("hex")}`;
  }

  /**
   * Verify a password against a hash
   * @param password Plaintext password
   * @param hash Hashed password
   */

  static async verifyPassword(password: string, hash: string) {
    const [salt, stored] = hash.split(":");

    if (!salt || !stored) return false;

    const derived = (await scryptAsync(password, salt, 64)) as Buffer;
    const left = derived;

    const right = Buffer.from(stored, "hex");

    if (left.length !== right.length) return false;

    return timingSafeEqual(left, right);
  }

  /**
   * Check if a date is in the past
   * @param expiresAt Expiry date
   */

  static isExpired(expiresAt: Date | null | string) {
    if (!expiresAt) return false;

    return new Date(expiresAt).getTime() <= Date.now();
  }

  /**
   * Record a view for a share link in the background
   * @param shareLinkId Share link ID
   * @param ipAddress IP address of the viewer
   * @param userAgent User agent of the viewer
   */

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

  /**
   * Create a new share link
   * @param userId User ID
   * @param documentId Document ID
   * @param data Share link data
   */

  static async createShareLink(
    userId: string,
    documentId: string,
    data: {
      password?: string;
      noExpiry?: boolean;
      expiresAt?: string | Date | null;
      snapshot: Prisma.InputJsonValue;
    },
  ) {
    const document = await prisma.document.findFirst({
      where: { id: documentId, userId },
      select: { id: true },
    });

    if (!document) throw new ApiError(404, "Document not found");

    // Check if a link already exists and delete it to prevent duplicates
    const existing = await prisma.shareLink.findFirst({
      where: { userId, documentId },
      select: { id: true, token: true },
    });

    if (existing) {
      await prisma.shareLink.delete({ where: { id: existing.id } });
    }

    const token = randomBytes(18).toString("hex");
    const passwordHash = data.password ? await this.hashPassword(data.password) : null;
    const expiresAt = data.noExpiry ? null : data.expiresAt ? new Date(data.expiresAt) : null;

    const shareLink = await prisma.shareLink.create({
      data: {
        userId,
        documentId,
        token,
        snapshot: data.snapshot,
        passwordHash,
        expiresAt,
      },
    });

    return { shareLink, oldToken: existing?.token };
  }

  /**
   * List all share links for a document
   * @param userId User ID
   * @param documentId Document ID
   */

  static async listShareLinks(userId: string, documentId: string) {
    return this.listShareLinksPaginated(userId, documentId, { limit: 100, offset: 0 });
  }

  static async listShareLinksPaginated(
    userId: string,
    documentId: string,
    query: { limit: number; offset: number },
  ) {
    const where = { userId, documentId };

    const [items, total] = await Promise.all([
      prisma.shareLink.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: query.limit,
        skip: query.offset,
      }),
      prisma.shareLink.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * Revoke a share link
   * @param userId User ID
   * @param documentId Document ID
   * @param shareLinkId Share link ID
   */

  static async revokeShareLink(userId: string, documentId: string, shareLinkId: string) {
    const existing = await prisma.shareLink.findFirst({
      where: { id: shareLinkId, userId, documentId },
      select: { id: true, token: true },
    });

    if (!existing) throw new ApiError(404, "Share link not found");

    await prisma.shareLink.delete({ where: { id: shareLinkId } });
    return existing.token;
  }

  /**
   * Get a public share link by token
   * @param token Share link token
   */

  static async getPublicShareLink(token: string) {
    const shareLink = await prisma.shareLink.findUnique({
      where: { token },
      include: { document: { select: { title: true } } },
    });

    if (!shareLink) throw new ApiError(404, "Link not found");
    if (this.isExpired(shareLink.expiresAt)) throw new ApiError(410, "Link expired");

    return shareLink;
  }
}
