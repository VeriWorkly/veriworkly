import { createClient } from "redis";

import { config } from "#config";

class InMemoryRedis {
  private store = new Map<string, any>();
  private expiries = new Map<string, number>();
  isOpen = true;

  async connect() {
    this.isOpen = true;
  }

  async quit() {
    this.isOpen = false;
  }

  private checkExpiry(key: string) {
    const expiry = this.expiries.get(key);
    if (expiry && expiry <= Date.now()) {
      this.store.delete(key);
      this.expiries.delete(key);
    }
  }

  async get(key: string): Promise<string | null> {
    this.checkExpiry(key);
    const val = this.store.get(key);
    if (typeof val === "string") return val;
    return null;
  }

  async set(key: string, value: string, options?: { NX?: boolean; EX?: number; PX?: number }): Promise<string | null> {
    this.checkExpiry(key);
    if (options?.NX && this.store.has(key)) {
      return null;
    }
    this.store.set(key, value);
    if (options?.EX) {
      this.expiries.set(key, Date.now() + options.EX * 1000);
    } else if (options?.PX) {
      this.expiries.set(key, Date.now() + options.PX);
    }
    return "OK";
  }

  async setEx(key: string, expirationSeconds: number, value: string): Promise<string> {
    this.store.set(key, value);
    this.expiries.set(key, Date.now() + expirationSeconds * 1000);
    return "OK";
  }

  async del(key: string | string[]): Promise<number> {
    const keys = Array.isArray(key) ? key : [key];
    let count = 0;
    for (const k of keys) {
      if (this.store.delete(k)) {
        this.expiries.delete(k);
        count++;
      }
    }
    return count;
  }

  async exists(key: string): Promise<number> {
    this.checkExpiry(key);
    return this.store.has(key) ? 1 : 0;
  }

  async rename(oldKey: string, newKey: string): Promise<string> {
    this.checkExpiry(oldKey);
    if (!this.store.has(oldKey)) {
      throw new Error(`ERR no such key: ${oldKey}`);
    }
    this.store.set(newKey, this.store.get(oldKey));
    const oldExpiry = this.expiries.get(oldKey);
    if (oldExpiry) {
      this.expiries.set(newKey, oldExpiry);
    } else {
      this.expiries.delete(newKey);
    }
    this.store.delete(oldKey);
    this.expiries.delete(oldKey);
    return "OK";
  }

  async expire(key: string, seconds: number): Promise<number> {
    this.checkExpiry(key);
    if (this.store.has(key)) {
      this.expiries.set(key, Date.now() + seconds * 1000);
      return 1;
    }
    return 0;
  }

  async scan(cursor: string, options?: { MATCH?: string; COUNT?: number }): Promise<{ cursor: string; keys: string[] }> {
    const match = options?.MATCH;
    const keys: string[] = [];
    for (const k of this.store.keys()) {
      this.checkExpiry(k);
      if (this.store.has(k)) {
        if (!match) {
          keys.push(k);
        } else {
          const regexStr = "^" + match.replace(/\*/g, ".*") + "$";
          const regex = new RegExp(regexStr);
          if (regex.test(k)) {
            keys.push(k);
          }
        }
      }
    }
    return { cursor: "0", keys };
  }

  async *scanIterator(options?: { MATCH?: string; COUNT?: number }): AsyncIterable<string> {
    const match = options?.MATCH;
    for (const k of Array.from(this.store.keys())) {
      this.checkExpiry(k);
      if (this.store.has(k)) {
        if (!match) {
          yield k;
        } else {
          const regexStr = "^" + match.replace(/\*/g, ".*") + "$";
          const regex = new RegExp(regexStr);
          if (regex.test(k)) {
            yield k;
          }
        }
      }
    }
  }

  async flushDb(): Promise<string> {
    this.store.clear();
    this.expiries.clear();
    return "OK";
  }

  async hExists(key: string, field: string): Promise<number> {
    this.checkExpiry(key);
    const hash = this.store.get(key);
    if (hash && typeof hash === "object" && !Array.isArray(hash)) {
      return field in hash ? 1 : 0;
    }
    return 0;
  }

  async hLen(key: string): Promise<number> {
    this.checkExpiry(key);
    const hash = this.store.get(key);
    if (hash && typeof hash === "object" && !Array.isArray(hash)) {
      return Object.keys(hash).length;
    }
    return 0;
  }

  // Hashes
  async hSet(key: string, field: string, value: string): Promise<number> {
    this.checkExpiry(key);
    let hash = this.store.get(key);
    if (!hash || typeof hash !== "object" || Array.isArray(hash)) {
      hash = {};
      this.store.set(key, hash);
    }
    const isNew = !(field in hash);
    hash[field] = value;
    return isNew ? 1 : 0;
  }

  async hGet(key: string, field: string): Promise<string | null> {
    this.checkExpiry(key);
    const hash = this.store.get(key);
    if (hash && typeof hash === "object" && field in hash) {
      return String(hash[field]);
    }
    return null;
  }

  async hGetAll(key: string): Promise<Record<string, string>> {
    this.checkExpiry(key);
    const hash = this.store.get(key);
    if (hash && typeof hash === "object" && !Array.isArray(hash)) {
      const result: Record<string, string> = {};
      for (const [k, v] of Object.entries(hash)) {
        result[k] = String(v);
      }
      return result;
    }
    return {};
  }

  async hIncrBy(key: string, field: string, increment: number): Promise<number> {
    this.checkExpiry(key);
    let hash = this.store.get(key);
    if (!hash || typeof hash !== "object" || Array.isArray(hash)) {
      hash = {};
      this.store.set(key, hash);
    }
    const val = parseInt(hash[field] || "0", 10) + increment;
    hash[field] = String(val);
    return val;
  }

  // Lists
  async lPush(key: string, value: string): Promise<number> {
    this.checkExpiry(key);
    let list = this.store.get(key);
    if (!list || !Array.isArray(list)) {
      list = [];
      this.store.set(key, list);
    }
    list.unshift(value);
    return list.length;
  }

  async lRange(key: string, start: number, end: number): Promise<string[]> {
    this.checkExpiry(key);
    const list = this.store.get(key);
    if (!list || !Array.isArray(list)) {
      return [];
    }
    const len = list.length;
    let s = start < 0 ? len + start : start;
    let e = end < 0 ? len + end : end;
    if (s < 0) s = 0;
    return list.slice(s, e + 1);
  }

  async lTrim(key: string, start: number, end: number): Promise<string> {
    this.checkExpiry(key);
    const list = this.store.get(key);
    if (list && Array.isArray(list)) {
      const len = list.length;
      let s = start < 0 ? len + start : start;
      let e = end < 0 ? len + end : end;
      if (s < 0) s = 0;
      this.store.set(key, list.slice(s, e + 1));
    }
    return "OK";
  }

  // Scripts / Eval
  async eval(script: string, options?: { keys?: string[]; arguments?: string[] }): Promise<any> {
    const keys = options?.keys || [];
    const args = options?.arguments || [];

    if (script.includes('redis.call("get", KEYS[1]) == ARGV[1]') || script.includes('releaseLockLuaScript')) {
      const lockKey = keys[0];
      const lockVal = args[0];
      if (await this.get(lockKey) === lockVal) {
        await this.del(lockKey);
        return 1;
      }
      return 0;
    }

    if (script.includes('local count = redis.call("INCR", KEYS[1])') || script.includes('INCREMENT_WITH_EXPIRY_SCRIPT')) {
      const key = keys[0];
      const windowMs = Number(args[0] || 0);
      if (!key) return [0, 0];

      this.checkExpiry(key);
      let count = Number(this.store.get(key) || 0) + 1;
      this.store.set(key, String(count));

      let expiry = this.expiries.get(key);
      if (count === 1) {
        expiry = Date.now() + windowMs;
        this.expiries.set(key, expiry);
      }

      const ttl = expiry ? Math.max(0, expiry - Date.now()) : 0;
      return [count, ttl];
    }

    return null;
  }

  multi() {
    const self = this;
    const commands: Array<() => Promise<any>> = [];
    const builder = {
      expire(key: string, seconds: number) {
        commands.push(async () => {
          await self.expire(key, seconds);
        });
        return builder;
      },
      async exec() {
        for (const cmd of commands) {
          await cmd();
        }
        return [];
      }
    };
    return builder;
  }

  on() {
    return this;
  }
}

let redisClient: ReturnType<typeof createClient> | null = null;

export async function initRedis() {
  if (redisClient?.isOpen) return redisClient;

  try {
    redisClient = createClient({
      url: config.redis.url,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 5) return new Error("Redis reconnection failed");
          return Math.min(retries * 100, 1000);
        },
      },
    });

    redisClient.on("error", (err) => {
      // Avoid printing repetitive logs during initial failure
      if (redisClient instanceof InMemoryRedis) return;
      console.error("Redis Client Error:", err);
    });

    redisClient.on("connect", () => {
      console.log("Redis Client Connected");
    });

    await redisClient.connect();

    return redisClient;
  } catch (error) {
    console.warn("Failed to initialize Redis, falling back to in-memory mock Redis client.");
    redisClient = new InMemoryRedis() as any;
    return redisClient;
  }
}

export function getRedis() {
  if (!redisClient || !redisClient.isOpen)
    throw new Error("Redis client not initialized or connection closed");

  return redisClient;
}

export async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

// --- Helper functions for caching ---

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const redis = getRedis();
    const data = await redis.get(key);

    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Cache get error:", error);
    return null;
  }
}

export async function cacheSet<T>(
  key: string,
  value: T,
  expirationSeconds: number = 3600,
): Promise<void> {
  try {
    const redis = getRedis();
    await redis.setEx(key, expirationSeconds, JSON.stringify(value));
  } catch (error) {
    console.error("Cache set error:", error);
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    const redis = getRedis();
    await redis.del(key);
  } catch (error) {
    console.error("Cache del error:", error);
  }
}

export async function cacheDelByPrefix(prefix: string): Promise<void> {
  try {
    const redis = getRedis();
    let cursor = "0";

    do {
      const result = await redis.scan(cursor, {
        MATCH: `${prefix}*`,
        COUNT: 100,
      });

      cursor = result.cursor;
      if (result.keys.length > 0) {
        await redis.del(result.keys);
      }
    } while (cursor !== "0");
  } catch (error) {
    console.error("Cache prefix delete error:", error);
  }
}
