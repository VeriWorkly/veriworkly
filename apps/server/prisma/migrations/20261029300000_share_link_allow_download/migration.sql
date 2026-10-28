-- V-421: a share link can turn off its Download button. Existing links keep downloads on.
ALTER TABLE "ShareLink" ADD COLUMN "allowDownload" BOOLEAN NOT NULL DEFAULT true;
