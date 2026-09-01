-- Removes TRIALING from SubscriptionStatus.
--
-- VeriWorkly no longer offers a free trial on any plan. The only trial that ever
-- existed was a 7-day trial on Creator Pro monthly for first-time subscribers, and no
-- subscription was ever created under it, so there are no rows carrying this value.
--
-- Postgres cannot drop a value from an enum in place, so the type is recreated. The
-- UPDATE below is defensive: it costs nothing on an empty set and guarantees the ALTER
-- cannot fail on an unexpected row.

-- Move any row that somehow holds the value being dropped.
UPDATE "Subscription" SET "status" = 'CANCELED' WHERE "status" = 'TRIALING';

-- Recreate the enum without TRIALING.
ALTER TYPE "SubscriptionStatus" RENAME TO "SubscriptionStatus_old";

CREATE TYPE "SubscriptionStatus" AS ENUM ('INACTIVE', 'ACTIVE', 'PAST_DUE', 'CANCELED');

ALTER TABLE "Subscription"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "SubscriptionStatus"
    USING ("status"::text::"SubscriptionStatus"),
  ALTER COLUMN "status" SET DEFAULT 'INACTIVE';

DROP TYPE "SubscriptionStatus_old";
