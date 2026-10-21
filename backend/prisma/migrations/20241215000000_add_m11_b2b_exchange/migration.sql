-- CreateEnum
CREATE TYPE "RFQStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLARIFICATION', 'CLOSED', 'UNDER_EVALUATION', 'AWARDED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "BiddingMode" AS ENUM ('SEALED', 'OPEN', 'REVERSE_AUCTION');

-- CreateEnum
CREATE TYPE "BidStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'WINNER', 'REJECTED', 'WITHDRAWN', 'DISQUALIFIED');

-- CreateTable
CREATE TABLE "RFQ" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "rfqNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "categoryPath" TEXT[] NOT NULL,
    "quantity" DECIMAL(15,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "deliveryLocation" TEXT,
    "deliveryDeadline" TIMESTAMP(3),
    "incoterm" TEXT,
    "currencyCode" TEXT NOT NULL DEFAULT 'IRR',
    "maxBudget" BIGINT,
    "budgetIsPublic" BOOLEAN NOT NULL DEFAULT false,
    "technicalSpecs" TEXT,
    "attachmentKeys" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "sampleRequired" BOOLEAN NOT NULL DEFAULT false,
    "inspectionRequired" BOOLEAN NOT NULL DEFAULT false,
    "status" "RFQStatus" NOT NULL DEFAULT 'DRAFT',
    "biddingMode" "BiddingMode" NOT NULL DEFAULT 'SEALED',
    "allowMultiRound" BOOLEAN NOT NULL DEFAULT false,
    "currentRound" INTEGER NOT NULL DEFAULT 1,
    "maxRounds" INTEGER NOT NULL DEFAULT 1,
    "allowPartialBid" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "invitedSupplierIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "publishedAt" TIMESTAMP(3),
    "submissionDeadline" TIMESTAMP(3) NOT NULL,
    "clarificationDeadline" TIMESTAMP(3),
    "evaluationDeadline" TIMESTAMP(3),
    "awardDeadline" TIMESTAMP(3),
    "evaluationCriteria" JSONB NOT NULL,
    "winnerId" TEXT,
    "awardedAt" TIMESTAMP(3),
    "awardedBy" TEXT,
    "awardNote" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "autoConvertToPO" BOOLEAN NOT NULL DEFAULT false,
    "poId" TEXT,
    "correspondenceLetterId" TEXT,
    "notes" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "RFQ_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RFQClarification" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "questionBy" TEXT NOT NULL,
    "questionByName" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "answeredBy" TEXT,
    "answeredAt" TIMESTAMP(3),
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RFQClarification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bid" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "supplierCompanyName" TEXT NOT NULL,
    "supplierContactName" TEXT,
    "supplierContactPhone" TEXT,
    "supplierContactEmail" TEXT,
    "round" INTEGER NOT NULL DEFAULT 1,
    "isLatestRound" BOOLEAN NOT NULL DEFAULT true,
    "previousBidId" TEXT,
    "unitPrice" BIGINT NOT NULL,
    "totalPrice" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IRR',
    "discountPercent" DECIMAL(5,2),
    "finalPrice" BIGINT NOT NULL,
    "priceBreakdown" JSONB,
    "taxIncluded" BOOLEAN NOT NULL DEFAULT false,
    "taxRate" DECIMAL(5,2),
    "deliveryDays" INTEGER NOT NULL,
    "deliveryLocation" TEXT,
    "paymentTerms" TEXT NOT NULL,
    "validityDays" INTEGER NOT NULL DEFAULT 30,
    "technicalResponse" TEXT,
    "technicalCompliance" BOOLEAN NOT NULL DEFAULT true,
    "technicalDeviations" TEXT,
    "sampleAttached" BOOLEAN NOT NULL DEFAULT false,
    "warrantyMonths" INTEGER,
    "afterSaleService" TEXT,
    "attachmentKeys" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "status" "BidStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "withdrawnAt" TIMESTAMP(3),
    "withdrawReason" TEXT,
    "evaluationScores" JSONB,
    "totalScore" DECIMAL(5,2),
    "rank" INTEGER,
    "isWinner" BOOLEAN NOT NULL DEFAULT false,
    "rejectionReason" TEXT,
    "isSealed" BOOLEAN NOT NULL DEFAULT true,
    "sealedAt" TIMESTAMP(3),
    "unsealedAt" TIMESTAMP(3),
    "encryptedFinancialData" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCatalog" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "sku" TEXT,
    "nameFa" TEXT NOT NULL,
    "nameEn" TEXT,
    "categoryId" TEXT NOT NULL,
    "categoryPath" TEXT[] NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL,
    "minOrderQty" DECIMAL(15,3),
    "leadTimeDays" INTEGER,
    "price" BIGINT,
    "currency" TEXT NOT NULL DEFAULT 'IRR',
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "imageKeys" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "certifications" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "rfqCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "B2BCategory" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT,
    "code" TEXT NOT NULL,
    "nameFa" TEXT NOT NULL,
    "nameEn" TEXT,
    "parentId" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "iconKey" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "B2BCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "B2BTransaction" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "buyerCompanyId" TEXT NOT NULL,
    "supplierCompanyId" TEXT NOT NULL,
    "bidId" TEXT NOT NULL,
    "proformaId" TEXT,
    "orderId" TEXT,
    "amount" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IRR',
    "status" TEXT NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "B2BTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierProfile" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "categories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "description" TEXT,
    "certifications" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "yearsInBusiness" INTEGER,
    "annualRevenue" TEXT,
    "employeeCount" INTEGER,
    "rating" DECIMAL(3,2),
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "totalWonBids" INTEGER NOT NULL DEFAULT 0,
    "totalBidsPlaced" INTEGER NOT NULL DEFAULT 0,
    "winRate" DECIMAL(5,2),
    "avgDeliveryScore" DECIMAL(3,2),
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BidReview" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "bidId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "buyerCompanyId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "deliveryScore" INTEGER NOT NULL,
    "qualityScore" INTEGER NOT NULL,
    "communicationScore" INTEGER NOT NULL,
    "review" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BidReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RFQ_rfqNumber_key" ON "RFQ"("rfqNumber");

-- CreateIndex
CREATE INDEX "RFQ_zoneId_status_idx" ON "RFQ"("zoneId", "status");

-- CreateIndex
CREATE INDEX "RFQ_companyId_status_idx" ON "RFQ"("companyId", "status");

-- CreateIndex
CREATE INDEX "RFQ_zoneId_categoryId_idx" ON "RFQ"("zoneId", "categoryId");

-- CreateIndex
CREATE INDEX "RFQ_submissionDeadline_status_idx" ON "RFQ"("submissionDeadline", "status");

-- CreateIndex
CREATE INDEX "RFQ_rfqNumber_idx" ON "RFQ"("rfqNumber");

-- CreateIndex
CREATE INDEX "RFQClarification_rfqId_idx" ON "RFQClarification"("rfqId");

-- CreateIndex
CREATE UNIQUE INDEX "Bid_rfqId_supplierId_round_key" ON "Bid"("rfqId", "supplierId", "round");

-- CreateIndex
CREATE INDEX "Bid_rfqId_status_idx" ON "Bid"("rfqId", "status");

-- CreateIndex
CREATE INDEX "Bid_supplierId_status_idx" ON "Bid"("supplierId", "status");

-- CreateIndex
CREATE INDEX "Bid_zoneId_status_idx" ON "Bid"("zoneId", "status");

-- CreateIndex
CREATE INDEX "Bid_rfqId_totalScore_idx" ON "Bid"("rfqId", "totalScore");

-- CreateIndex
CREATE INDEX "ProductCatalog_zoneId_categoryId_isAvailable_idx" ON "ProductCatalog"("zoneId", "categoryId", "isAvailable");

-- CreateIndex
CREATE INDEX "ProductCatalog_companyId_isAvailable_idx" ON "ProductCatalog"("companyId", "isAvailable");

-- CreateIndex
CREATE INDEX "ProductCatalog_zoneId_nameFa_idx" ON "ProductCatalog"("zoneId", "nameFa");

-- CreateIndex
CREATE UNIQUE INDEX "B2BCategory_zoneId_code_key" ON "B2BCategory"("zoneId", "code");

-- CreateIndex
CREATE INDEX "B2BCategory_parentId_idx" ON "B2BCategory"("parentId");

-- CreateIndex
CREATE INDEX "B2BTransaction_zoneId_buyerCompanyId_idx" ON "B2BTransaction"("zoneId", "buyerCompanyId");

-- CreateIndex
CREATE INDEX "B2BTransaction_zoneId_supplierCompanyId_idx" ON "B2BTransaction"("zoneId", "supplierCompanyId");

-- CreateIndex
CREATE INDEX "B2BTransaction_rfqId_idx" ON "B2BTransaction"("rfqId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierProfile_companyId_key" ON "SupplierProfile"("companyId");

-- CreateIndex
CREATE INDEX "SupplierProfile_zoneId_isActive_idx" ON "SupplierProfile"("zoneId", "isActive");

-- CreateIndex
CREATE INDEX "SupplierProfile_zoneId_categories_idx" ON "SupplierProfile"("zoneId", "categories");

-- CreateIndex
CREATE UNIQUE INDEX "BidReview_rfqId_supplierId_buyerCompanyId_key" ON "BidReview"("rfqId", "supplierId", "buyerCompanyId");

-- CreateIndex
CREATE INDEX "BidReview_supplierId_idx" ON "BidReview"("supplierId");

-- AddForeignKey
ALTER TABLE "RFQ" ADD CONSTRAINT "RFQ_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RFQ" ADD CONSTRAINT "RFQ_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RFQClarification" ADD CONSTRAINT "RFQClarification_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "RFQ"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "RFQ"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCatalog" ADD CONSTRAINT "ProductCatalog_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCatalog" ADD CONSTRAINT "ProductCatalog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2BCategory" ADD CONSTRAINT "B2BCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "B2BCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
