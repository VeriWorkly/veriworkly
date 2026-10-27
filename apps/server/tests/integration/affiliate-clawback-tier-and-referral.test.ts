import request from "supertest";
import { describe, expect, it } from "vitest";

import { app } from "#app";
import { prisma } from "#lib/prisma";

import { STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession, type TestUser } from "./helpers/auth.js";

/** Phase 11 group 1, P5: V-321 (claw-back netted on withdrawals), V-322 (tier), V-323 (referral). */

const BASE = "/api/v1/affiliates";

const asUser = (user: TestUser) => ({
  get: (url: string) =>
    request(app).get(url).set("Origin", STUDIO_ORIGIN).set("Cookie", user.cookie),
  post: (url: string) =>
    request(app).post(url).set("Origin", STUDIO_ORIGIN).set("Cookie", user.cookie),
  patch: (url: string) =>
    request(app).patch(url).set("Origin", STUDIO_ORIGIN).set("Cookie", user.cookie),
});

/** An enrolled affiliate whose session came from a routable address (see affiliate-money). */
async function enrolledAffiliate(sessionIp = "203.0.113.7") {
  const user = await createUserWithSession();
  await prisma.session.updateMany({ where: { userId: user.id }, data: { ipAddress: sessionIp } });
  const response = await asUser(user).post(`${BASE}/enroll`).send({});
  expect(response.status).toBe(200);
  return { user, code: response.body.data.affiliateCode as string };
}

describe("V-323: applying a referral code answers without the referral row", () => {
  it("returns { applied: true }, never the affiliate's id or the shared-address flag", async () => {
    const { user: affiliate, code } = await enrolledAffiliate("127.0.0.1");
    const referred = await createUserWithSession();

    const response = await asUser(referred).post(`${BASE}/referral`).send({ code });

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body.data).toEqual({ applied: true });
    const body = JSON.stringify(response.body);
    expect(body).not.toContain(affiliate.id);
    expect(body).not.toContain("sharedAddressWithAffiliate");
    expect(body).not.toContain("ipHash");
    // The referral itself is recorded as before.
    expect(
      await prisma.affiliateReferral.count({
        where: { affiliateId: affiliate.id, referredUserId: referred.id },
      }),
    ).toBe(1);
  });
});
