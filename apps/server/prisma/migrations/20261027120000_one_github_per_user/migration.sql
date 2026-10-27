-- V-265: one GitHub account per VeriWorkly user, enforced by Postgres so two link callbacks
-- racing for different GitHub accounts cannot both win. Prisma cannot express a partial index,
-- so this index is not in schema.prisma and db:drift cannot see it; an integration test checks
-- that it exists.
--
-- Users who already have more than one GitHub row stop the migration with an error instead of
-- losing a row: which one to keep is an owner decision, not something to guess here.
DO $$
DECLARE
  duplicated INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicated FROM (
    SELECT "userId" FROM "Account" WHERE "providerId" = 'github' GROUP BY "userId" HAVING COUNT(*) > 1
  ) AS d;

  IF duplicated > 0 THEN
    RAISE EXCEPTION 'V-265: % user(s) have more than one GitHub account linked. Decide which row each keeps and delete the others by hand, then re-run the migration. List them with: SELECT "userId", array_agg("accountId") FROM "Account" WHERE "providerId" = ''github'' GROUP BY "userId" HAVING COUNT(*) > 1;', duplicated;
  END IF;
END $$;

CREATE UNIQUE INDEX "Account_userId_github_key" ON "Account"("userId") WHERE "providerId" = 'github';
