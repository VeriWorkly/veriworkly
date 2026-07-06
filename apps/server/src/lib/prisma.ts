import pg from "pg";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { logger } from "./logger.js";

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const isProduction = process.env.NODE_ENV === "production";

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: parsePositiveInt(process.env.DB_POOL_MAX, isProduction ? 30 : 5),
  idleTimeoutMillis: parsePositiveInt(process.env.DB_POOL_IDLE_TIMEOUT_MS, 15_000),
  connectionTimeoutMillis: parsePositiveInt(process.env.DB_POOL_CONNECTION_TIMEOUT_MS, 5_000),
  statement_timeout: parsePositiveInt(process.env.DB_POOL_STATEMENT_TIMEOUT_MS, 30_000),
  allowExitOnIdle: true,
});

pool.on("error", (err) => {
  logger.error("Unexpected database connection pool error", err);
});

const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function closePrisma() {
  try {
    await prisma.$disconnect();
    await pool.end();
  } catch (error) {
    logger.error("Error closing Prisma connections", error);
  }
}

export default prisma;
