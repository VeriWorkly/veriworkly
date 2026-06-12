ALTER TABLE "BillingWebhookEvent"
ADD COLUMN "retryCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lastAttemptAt" TIMESTAMP(3);

CREATE TABLE "ViewFlushBatch" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ViewFlushBatch_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ViewFlushBatch_kind_createdAt_idx" ON "ViewFlushBatch"("kind", "createdAt");
