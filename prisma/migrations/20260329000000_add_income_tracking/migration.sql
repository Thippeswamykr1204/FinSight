-- AlterEnum
ALTER TYPE "Category" ADD VALUE 'SALARY';
ALTER TYPE "Category" ADD VALUE 'FREELANCE';
ALTER TYPE "Category" ADD VALUE 'INVESTMENTS';
ALTER TYPE "Category" ADD VALUE 'OTHER_INCOME';

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('EXPENSE', 'INCOME');

-- AlterTable
ALTER TABLE "Transaction"
ADD COLUMN "type" "TransactionType" NOT NULL DEFAULT 'EXPENSE';

-- CreateIndex
CREATE INDEX "Transaction_type_idx" ON "Transaction"("type");
