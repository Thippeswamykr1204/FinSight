-- Older users have no recorded acceptance; do not fabricate consent history.
ALTER TABLE "v2_users" ADD COLUMN "noticeAccepted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "noticeVersion" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "noticeAcceptedAt" TIMESTAMP(3);
