CREATE TABLE "UsageMetricFlushBatch" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UsageMetricFlushBatch_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UsageMetricFlushBatch_date_idx" ON "UsageMetricFlushBatch"("date");
