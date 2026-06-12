import { ApiError } from "#utils/errors";
import { prisma } from "#utils/prisma";

import type { EntitlementKey } from "#services/productCatalog";

const activeGrantWhere = (at: Date) => ({
  startsAt: { lte: at },
  revokedAt: null,
  OR: [{ endsAt: null }, { endsAt: { gt: at } }],
});

export class EntitlementService {
  static async listActive(userId: string, at = new Date()) {
    const grants = await prisma.entitlementGrant.findMany({
      where: { userId, ...activeGrantWhere(at) },
      select: { key: true, endsAt: true },
      orderBy: { endsAt: "desc" },
    });

    return [...new Set(grants.map((grant) => grant.key))];
  }

  static async has(userId: string, key: EntitlementKey, at = new Date()) {
    return (
      (await prisma.entitlementGrant.count({
        where: { userId, key, ...activeGrantWhere(at) },
      })) > 0
    );
  }

  static async require(userId: string, key: EntitlementKey, message: string) {
    if (!(await this.has(userId, key))) throw new ApiError(402, message);
  }
}
