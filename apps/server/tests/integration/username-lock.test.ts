import { randomBytes } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { app } from "#app";
import { prisma } from "#lib/prisma";

import { STUDIO_ORIGIN } from "./env.js";
import { createUserWithSession, type TestUser } from "./helpers/auth.js";

/**
 * V-419: a username is chosen once (it is the path of every share link and the public profile).
 * `PUT /users/me/username` sets it while it is empty, answers 409 once it is set, and 409 when
 * another account holds the name.
 */
async function userWithoutUsername() {
  const user = await createUserWithSession();
  await prisma.user.update({ where: { id: user.id }, data: { username: null } });
  return user;
}

function setUsername(user: TestUser, username: string) {
  return request(app)
    .put("/api/v1/users/me/username")
    .set("Origin", STUDIO_ORIGIN)
    .set("Cookie", user.cookie)
    .send({ username });
}

const fresh = () => `name${randomBytes(4).toString("hex")}`;

describe("username lock (V-419)", () => {
  it("sets an empty username once, then refuses to change it", async () => {
    const user = await userWithoutUsername();
    const first = fresh();

    const set = await setUsername(user, first);
    expect(set.status, JSON.stringify(set.body)).toBe(200);

    const change = await setUsername(user, fresh());
    expect(change.status).toBe(409);
    expect(change.body.message).toBe("Username is locked and cannot be changed");
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).username).toBe(first);

    // Sending the name it already has is not a change.
    expect((await setUsername(user, first)).status).toBe(200);
  });

  it("refuses a name another account holds", async () => {
    const holder = await userWithoutUsername();
    const taken = fresh();
    expect((await setUsername(holder, taken)).status).toBe(200);

    const other = await userWithoutUsername();
    const response = await setUsername(other, taken);
    expect(response.status).toBe(409);
    expect(response.body.message).toBe("Username is already taken");
    expect((await prisma.user.findUniqueOrThrow({ where: { id: other.id } })).username).toBeNull();
  });
});
