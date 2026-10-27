import request from "supertest";
import { beforeAll, beforeEach } from "vitest";

import { app } from "#app";
import { getRedis } from "#lib/redis";

import { STUDIO_ORIGIN } from "../env.js";
import { createUserWithSession, type TestUser } from "./auth.js";

/**
 * The configured admin (env.ts sets ADMIN_EMAIL) for a test file, created once, with Redis
 * flushed before every test: admin reads are cached, and each test reads what it just wrote.
 * Call at module scope.
 */
export function adminClient() {
  let admin: TestUser;

  beforeAll(async () => {
    admin = await createUserWithSession({ email: "admin@example.test" });
  });

  beforeEach(async () => {
    await getRedis().flushDb();
  });

  return {
    get id() {
      return admin.id;
    },
    request(method: "get" | "patch" | "post" | "delete", path: string) {
      return request(app)
        [method](`/api/v1${path}`)
        .set("Origin", STUDIO_ORIGIN)
        .set("Cookie", admin.cookie);
    },
  };
}
