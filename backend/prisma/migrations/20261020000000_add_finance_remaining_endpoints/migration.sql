-- CreateEnum
CREATE TYPE "FinanceVisitorStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "FinanceCheckbookStatus" AS ENUM ('active', 'exhausted', 'cancelled');

-- CreateEnum
CREATE TYPE "FinanceCheckDirection" AS ENUM ('incoming', 'outgoing');

-- CreateEnum
CREATE TYPE "FinanceCheckStatus" AS ENUM ('issued', 'pending_clearance', 'cleared', 'bounced', 'cancelled', 'returned');

-- CreateEnum
CREATE TYPE "FinanceRpDocType" AS ENUM ('cash_receipt', 'check_receipt', 'transfer_receipt', 'cash_payment', 'check_payment', 'transfer_payment');

-- CreateEnum
CREATE TYPE "FinanceRpType" AS ENUM ('receipt', 'payment', 'internal_transfer');

-- CreateEnum
CREATE TYPE "FinanceRpStatus" AS ENUM ('draft', 'prepared', 'approved', 'posted', 'bounced', 'cancelled');

-- CreateEnum
CREATE TYPE "FinanceInstrumentType" AS ENUM ('cash', 'check', 'promissory_note', 'bank_transfer', 'online', 'lc');

-- CreateEnum
CREATE TYPE "FinanceEntityType" AS ENUM ('buyer', 'seller', 'employee', 'other');

-- CreateTable
CREATE TABLE "FinanceVisitor" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "region" TEXT NOT NULL DEFAULT '',
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "FinanceVisitorStatus" NOT NULL DEFAULT 'active',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceVisitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceCheckbook" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "bookNumber" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL DEFAULT '',
    "bankName" TEXT NOT NULL DEFAULT '',
    "accountNumber" TEXT NOT NULL DEFAULT '',
    "series" TEXT NOT NULL DEFAULT '',
    "startNumber" TEXT NOT NULL DEFAULT '',
    "endNumber" TEXT NOT NULL DEFAULT '',
    "currentNumber" TEXT NOT NULL DEFAULT '',
    "totalLeaves" INTEGER NOT NULL DEFAULT 0,
    "usedLeaves" INTEGER NOT NULL DEFAULT 0,
    "remainingLeaves" INTEGER NOT NULL DEFAULT 0,
    "status" "FinanceCheckbookStatus" NOT NULL DEFAULT 'active',
    "issuedDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceCheckbook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceCheck" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "checkNumber" TEXT NOT NULL,
    "checkbookId" TEXT NOT NULL DEFAULT '',
    "bankAccountId" TEXT NOT NULL DEFAULT '',
    "bankName" TEXT NOT NULL DEFAULT '',
    "direction" "FinanceCheckDirection" NOT NULL,
    "payeeName" TEXT NOT NULL DEFAULT '',
    "payerName" TEXT NOT NULL DEFAULT '',
    "amount" BIGINT NOT NULL DEFAULT 0,
    "currency" "FinanceCurrencyCode" NOT NULL DEFAULT 'IRR',
    "issueDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "clearanceDate" TIMESTAMP(3),
    "status" "FinanceCheckStatus" NOT NULL DEFAULT 'issued',
    "rpDocumentId" TEXT,
    "glVoucherId" TEXT,
    "bounceReason" TEXT,
    "bounceDate" TIMESTAMP(3),
    "bouncePenaltyAmount" BIGINT,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceReceiptPaymentDoc" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "docType" "FinanceRpDocType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "FinanceRpType" NOT NULL,
    "status" "FinanceRpStatus" NOT NULL DEFAULT 'draft',
    "statusChangeDate" TIMESTAMP(3) NOT NULL,
    "entityId" TEXT NOT NULL DEFAULT '',
    "entityName" TEXT NOT NULL DEFAULT '',
    "entityType" "FinanceEntityType" NOT NULL DEFAULT 'other',
    "instrumentType" "FinanceInstrumentType" NOT NULL DEFAULT 'cash',
    "checkId" TEXT,
    "checkNumber" TEXT,
    "checkDate" TIMESTAMP(3),
    "bankName" TEXT,
    "bankBranch" TEXT,
    "bankAccountId" TEXT,
    "transactionRef" TEXT,
    "totalAmount" BIGINT NOT NULL DEFAULT 0,
    "currency" "FinanceCurrencyCode" NOT NULL DEFAULT 'IRR',
    "exchangeRate" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "parentDocumentId" TEXT,
    "parentDocNumber" TEXT,
    "isPartial" BOOLEAN NOT NULL DEFAULT false,
    "remainingAmount" BIGINT,
    "preparedBy" TEXT NOT NULL DEFAULT '',
    "approvedBy" TEXT,
    "postedBy" TEXT,
    "notes" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "glVoucherId" TEXT,
    "cancelReason" TEXT,
    "bounceReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceReceiptPaymentDoc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceReceiptPaymentLine" (
    "id" TEXT NOT NULL,
    "docId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL DEFAULT '',
    "accountCode" TEXT NOT NULL DEFAULT '',
    "accountName" TEXT NOT NULL DEFAULT '',
    "amount" BIGINT NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL DEFAULT '',
    "projectId" TEXT,
    "costCenterId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceReceiptPaymentLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinanceVisitor_zoneId_code_idx" ON "FinanceVisitor"("zoneId", "code");

-- CreateIndex
CREATE INDEX "FinanceVisitor_zoneId_status_idx" ON "FinanceVisitor"("zoneId", "status");

-- CreateIndex
CREATE INDEX "FinanceCheckbook_zoneId_bookNumber_idx" ON "FinanceCheckbook"("zoneId", "bookNumber");

-- CreateIndex
CREATE INDEX "FinanceCheckbook_zoneId_status_idx" ON "FinanceCheckbook"("zoneId", "status");

-- CreateIndex
CREATE INDEX "FinanceCheck_zoneId_checkNumber_idx" ON "FinanceCheck"("zoneId", "checkNumber");

-- CreateIndex
CREATE INDEX "FinanceCheck_zoneId_status_idx" ON "FinanceCheck"("zoneId", "status");

-- CreateIndex
CREATE INDEX "FinanceCheck_zoneId_checkbookId_idx" ON "FinanceCheck"("zoneId", "checkbookId");

-- CreateIndex
CREATE INDEX "FinanceReceiptPaymentDoc_zoneId_documentNumber_idx" ON "FinanceReceiptPaymentDoc"("zoneId", "documentNumber");

-- CreateIndex
CREATE INDEX "FinanceReceiptPaymentDoc_zoneId_status_idx" ON "FinanceReceiptPaymentDoc"("zoneId", "status");

-- CreateIndex
CREATE INDEX "FinanceReceiptPaymentDoc_zoneId_docType_idx" ON "FinanceReceiptPaymentDoc"("zoneId", "docType");

-- CreateIndex
CREATE INDEX "FinanceReceiptPaymentLine_docId_idx" ON "FinanceReceiptPaymentLine"("docId");

-- AddForeignKey
ALTER TABLE "FinanceReceiptPaymentLine" ADD CONSTRAINT "FinanceReceiptPaymentLine_docId_fkey" FOREIGN KEY ("docId") REFERENCES "FinanceReceiptPaymentDoc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

