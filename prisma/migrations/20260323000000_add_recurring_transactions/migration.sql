-- CreateEnum
CREATE TYPE "RecurrenceFrequency" AS ENUM ('MONTHLY');

-- AlterTable
ALTER TABLE "Transaction"
ADD COLUMN "recurrenceFrequency" "RecurrenceFrequency",
ADD COLUMN "recurringSeriesId" TEXT;

-- CreateIndex
CREATE INDEX "Transaction_recurringSeriesId_idx" ON "Transaction"("recurringSeriesId");
