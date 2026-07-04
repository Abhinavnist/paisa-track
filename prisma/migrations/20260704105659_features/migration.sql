-- CreateEnum
CREATE TYPE "Frequency" AS ENUM ('MONTHLY', 'WEEKLY');

-- AlterEnum
ALTER TYPE "TxSource" ADD VALUE 'RECURRING';

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "monthlyBudget" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "RecurringRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" "TxType" NOT NULL DEFAULT 'EXPENSE',
    "categoryId" TEXT,
    "note" TEXT,
    "frequency" "Frequency" NOT NULL DEFAULT 'MONTHLY',
    "dayOfMonth" INTEGER NOT NULL DEFAULT 1,
    "weekday" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "lastPostedPeriod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecurringRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecurringRule_userId_idx" ON "RecurringRule"("userId");

-- AddForeignKey
ALTER TABLE "RecurringRule" ADD CONSTRAINT "RecurringRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringRule" ADD CONSTRAINT "RecurringRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
