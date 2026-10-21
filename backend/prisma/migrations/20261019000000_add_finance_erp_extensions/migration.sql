-- CreateEnum
CREATE TYPE "FinanceAssetCategory" AS ENUM ('land', 'building', 'machinery', 'vehicle', 'furniture', 'it_equipment');

-- CreateEnum
CREATE TYPE "FinanceDepreciationMethod" AS ENUM ('straight_line', 'declining_balance', 'units_of_production');

-- CreateEnum
CREATE TYPE "FinanceAssetStatus" AS ENUM ('active', 'under_maintenance', 'idle', 'disposed', 'sold', 'deleted');

-- CreateEnum
CREATE TYPE "FinanceDisposalType" AS ENUM ('sale', 'scrap', 'donation');

-- CreateEnum
CREATE TYPE "FinanceMaintenanceType" AS ENUM ('preventive', 'corrective', 'emergency');

-- CreateEnum
CREATE TYPE "FinanceDocumentStatus" AS ENUM ('draft', 'prepared', 'approved', 'authorized', 'posted', 'cancelled');

-- CreateEnum
CREATE TYPE "FinancePurchaseDocType" AS ENUM ('purchase_invoice', 'purchase_return', 'pre_invoice_purchase');

-- CreateEnum
CREATE TYPE "FinanceSalesDocType" AS ENUM ('sales_invoice', 'sales_return', 'pre_invoice_sales');

-- CreateEnum
CREATE TYPE "FinanceCurrencyCode" AS ENUM ('IRR', 'USD', 'EUR');

-- CreateEnum
CREATE TYPE "FinanceBuyerSellerType" AS ENUM ('buyer', 'seller', 'both');

-- CreateEnum
CREATE TYPE "FinancePaymentMethod" AS ENUM ('cash', 'check', 'credit', 'online', 'lc', 'bank_transfer');

-- CreateEnum
CREATE TYPE "FinanceBuyerSellerStatus" AS ENUM ('active', 'inactive', 'blacklisted');

-- CreateTable
CREATE TABLE "FixedAsset" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "companyId" TEXT,
    "assetCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "FinanceAssetCategory" NOT NULL,
    "location" TEXT,
    "acquisitionDate" TIMESTAMP(3) NOT NULL,
    "acquisitionCost" BIGINT NOT NULL DEFAULT 0,
    "additionalCosts" BIGINT NOT NULL DEFAULT 0,
    "totalCapitalizedCost" BIGINT NOT NULL DEFAULT 0,
    "depreciationMethod" "FinanceDepreciationMethod" NOT NULL DEFAULT 'straight_line',
    "usefulLifeYears" INTEGER NOT NULL DEFAULT 1,
    "salvageValue" BIGINT NOT NULL DEFAULT 0,
    "depreciationStartDate" TIMESTAMP(3) NOT NULL,
    "accumulatedDepreciation" BIGINT NOT NULL DEFAULT 0,
    "netBookValue" BIGINT NOT NULL DEFAULT 0,
    "status" "FinanceAssetStatus" NOT NULL DEFAULT 'active',
    "disposalDate" TIMESTAMP(3),
    "disposalType" "FinanceDisposalType",
    "disposalBuyer" TEXT,
    "disposalNotes" TEXT,
    "disposalProceeds" BIGINT,
    "gainLossOnDisposal" BIGINT,
    "insurancePolicyId" TEXT,
    "depreciationVoucherIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "qrCode" TEXT,
    "attachmentName" TEXT,
    "assetAccountId" TEXT,
    "depExpenseAccountId" TEXT,
    "accumDepAccountId" TEXT,
    "custodianEmployeeId" TEXT,
    "custodianName" TEXT,
    "assignedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FixedAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceRecord" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "FinanceMaintenanceType" NOT NULL,
    "description" TEXT NOT NULL,
    "cost" BIGINT NOT NULL DEFAULT 0,
    "vendor" TEXT,
    "nextMaintenanceDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceDocument" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "companyId" TEXT,
    "documentNumber" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "FinanceDocumentStatus" NOT NULL DEFAULT 'draft',
    "statusChangeDate" TIMESTAMP(3) NOT NULL,
    "purchaseType" "FinancePurchaseDocType",
    "vendorName" TEXT,
    "vendorCode" TEXT,
    "payableAmount" BIGINT,
    "salesType" "FinanceSalesDocType",
    "buyerName" TEXT,
    "buyerCode" TEXT,
    "receivableAmount" BIGINT,
    "itemNumber" TEXT,
    "lineCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "preparedBy" TEXT NOT NULL DEFAULT '',
    "approvedBy" TEXT NOT NULL DEFAULT '',
    "authorizedBy" TEXT NOT NULL DEFAULT '',
    "accountingDocRef" TEXT,
    "escrowRequired" BOOLEAN NOT NULL DEFAULT false,
    "visitorName" TEXT NOT NULL DEFAULT '',
    "projectId" TEXT,
    "costCenterId" TEXT,
    "currencyCode" "FinanceCurrencyCode" NOT NULL DEFAULT 'IRR',
    "exchangeRate" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "totalBeforeDiscount" BIGINT NOT NULL DEFAULT 0,
    "totalDiscount" BIGINT NOT NULL DEFAULT 0,
    "totalTax" BIGINT NOT NULL DEFAULT 0,
    "grandTotal" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentLine" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" BIGINT NOT NULL DEFAULT 0,
    "discount" BIGINT NOT NULL DEFAULT 0,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lineTotal" BIGINT NOT NULL DEFAULT 0,
    "warehouseId" TEXT,
    "projectId" TEXT,
    "costCenterId" TEXT,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyerSeller" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "companyId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "type" "FinanceBuyerSellerType" NOT NULL,
    "paymentMethod" "FinancePaymentMethod" NOT NULL DEFAULT 'cash',
    "groupName" TEXT NOT NULL DEFAULT '',
    "groupId" TEXT,
    "notes" TEXT NOT NULL DEFAULT '',
    "visitorId" TEXT,
    "subAccountId" TEXT,
    "transferredFromAccounting" BOOLEAN NOT NULL DEFAULT false,
    "taxId" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "creditLimit" BIGINT NOT NULL DEFAULT 0,
    "currentBalance" BIGINT NOT NULL DEFAULT 0,
    "status" "FinanceBuyerSellerStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuyerSeller_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyerSellerBankAccount" (
    "id" TEXT NOT NULL,
    "buyerSellerId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "iban" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuyerSellerBankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FixedAsset_zoneId_status_idx" ON "FixedAsset"("zoneId", "status");

-- CreateIndex
CREATE INDEX "FixedAsset_zoneId_category_idx" ON "FixedAsset"("zoneId", "category");

-- CreateIndex
CREATE INDEX "FixedAsset_zoneId_assetCode_idx" ON "FixedAsset"("zoneId", "assetCode");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_assetId_idx" ON "MaintenanceRecord"("assetId");

-- CreateIndex
CREATE INDEX "FinanceDocument_zoneId_kind_idx" ON "FinanceDocument"("zoneId", "kind");

-- CreateIndex
CREATE INDEX "FinanceDocument_zoneId_status_idx" ON "FinanceDocument"("zoneId", "status");

-- CreateIndex
CREATE INDEX "FinanceDocument_zoneId_kind_documentNumber_idx" ON "FinanceDocument"("zoneId", "kind", "documentNumber");

-- CreateIndex
CREATE INDEX "DocumentLine_documentId_idx" ON "DocumentLine"("documentId");

-- CreateIndex
CREATE INDEX "BuyerSeller_zoneId_status_idx" ON "BuyerSeller"("zoneId", "status");

-- CreateIndex
CREATE INDEX "BuyerSeller_zoneId_type_idx" ON "BuyerSeller"("zoneId", "type");

-- CreateIndex
CREATE INDEX "BuyerSeller_zoneId_code_idx" ON "BuyerSeller"("zoneId", "code");

-- CreateIndex
CREATE INDEX "BuyerSellerBankAccount_buyerSellerId_idx" ON "BuyerSellerBankAccount"("buyerSellerId");

-- AddForeignKey
ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "FixedAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentLine" ADD CONSTRAINT "DocumentLine_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "FinanceDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerSellerBankAccount" ADD CONSTRAINT "BuyerSellerBankAccount_buyerSellerId_fkey" FOREIGN KEY ("buyerSellerId") REFERENCES "BuyerSeller"("id") ON DELETE CASCADE ON UPDATE CASCADE;
