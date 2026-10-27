-- V-301: a portfolio draft kept its subdomain in "Document"."slug", which is unique per user over
-- every document, trashed ones included, and follows the title. A subdomain matching a résumé's
-- slug or a just-trashed draft's was refused with a confusing 409, and a rename moved it. The
-- subdomain gets its own column; the slug becomes an ordinary document slug.
ALTER TABLE "Document" ADD COLUMN "portfolioSubdomain" TEXT;

-- Every existing draft keeps the subdomain it was saved under.
UPDATE "Document" SET "portfolioSubdomain" = "slug" WHERE "type" = 'PORTFOLIO';
