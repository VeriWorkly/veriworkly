import { describe, expect, it } from "vitest";

import { prisma } from "#lib/prisma";
import { UserService } from "#services/userService";

import { createUserWithSession } from "./helpers/auth.js";

/**
 * V-374: account deletion checks for an open withdrawal before its transaction. A withdrawal the
 * affiliate requests in another tab while the deletion runs used to commit in between and be
 * detached (no user, still REQUESTED), where an admin can neither pay nor reject it. The deletion
 * now checks again once it holds the User row lock, the lock `requestWithdrawal` takes first.
 */
describe("V-374 a withdrawal requested while the account is being deleted", () => {
  it("makes the deletion refuse with 409 instead of orphaning the withdrawal", async () => {
    const user = await createUserWithSession();

    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    let locked!: () => void;
    const holding = new Promise<void>((resolve) => (locked = resolve));

    // `requestWithdrawal`'s shape: lock the User row, insert the withdrawal, commit later.
    const withdrawal = prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${user.id} FOR NO KEY UPDATE`;
        await tx.affiliateWithdrawal.create({ data: { userId: user.id, amountCents: 4_000 } });
        locked();
        await gate;
      },
      { timeout: 30_000 },
    );
    await holding;

    // The deletion's pre-checks see nothing yet; its transaction waits on the User row.
    const deletion = UserService.deleteUserAccount(user.id, { confirmAffiliateForfeit: true });
    await new Promise((resolve) => setTimeout(resolve, 500));
    release();
    await withdrawal;

    await expect(deletion).rejects.toMatchObject({ statusCode: 409 });
    expect(await prisma.user.count({ where: { id: user.id } })).toBe(1);
    const rows = await prisma.affiliateWithdrawal.findMany({ where: { userId: user.id } });
    expect(rows.map((row) => row.status)).toEqual(["REQUESTED"]);
  });
});
