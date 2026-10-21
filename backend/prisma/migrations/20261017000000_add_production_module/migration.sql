-- CreateEnum
CREATE TYPE "ProductionLineStatus" AS ENUM ('idle', 'running', 'maintenance', 'breakdown');

-- CreateEnum
CREATE TYPE "ProductionLineShift" AS ENUM ('morning', 'afternoon', 'night', 'offline');

-- CreateEnum
CREATE TYPE "ProductionSalesOrderStatus" AS ENUM ('draft', 'confirmed', 'in_production', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "ProductionOrderPriority" AS ENUM ('normal', 'urgent', 'critical');

-- CreateEnum
CREATE TYPE "ProductionWorkOrderStatus" AS ENUM ('planned', 'released', 'in_progress', 'completed', 'on_hold', 'cancelled');

-- CreateEnum
CREATE TYPE "ProductionShift" AS ENUM ('morning', 'afternoon', 'night');

-- CreateEnum
CREATE TYPE "ProductionBomStatus" AS ENUM ('draft', 'active', 'obsolete');

-- CreateEnum
CREATE TYPE "ProductionCheckType" AS ENUM ('incoming', 'in_process', 'final', 'outgoing');

-- CreateEnum
CREATE TYPE "ProductionCheckResult" AS ENUM ('pass', 'fail', 'conditional', 'pending');

-- CreateEnum
CREATE TYPE "NcrSeverity" AS ENUM ('minor', 'major', 'critical');

-- CreateEnum
CREATE TYPE "NcrStatus" AS ENUM ('open', 'under_review', 'corrective_action', 'closed', 'rejected');

-- CreateEnum
CREATE TYPE "ScrapReason" AS ENUM ('defect', 'setup_waste', 'trial_run', 'material_issue', 'machine_issue', 'other');

-- CreateEnum
CREATE TYPE "ScrapDisposalMethod" AS ENUM ('recycled', 'rework', 'disposal', 'vendor_return');

-- CreateTable
CREATE TABLE "ProductionLine" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT,
    "code" TEXT NOT NULL,
    "nameFa" TEXT NOT NULL,
    "capacity" DOUBLE PRECISION NOT NULL,
    "currentStatus" "ProductionLineStatus" NOT NULL DEFAULT 'idle',
    "currentWorkOrderId" TEXT,
    "shift" "ProductionLineShift" NOT NULL DEFAULT 'morning',
    "oee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastMaintenanceDate" TEXT,
    "nextMaintenanceDate" TEXT,
    "supervisorName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductionLine_zoneId_idx" ON "ProductionLine"("zoneId");

-- CreateIndex
CREATE INDEX "ProductionLine_code_idx" ON "ProductionLine"("code");

-- CreateIndex
CREATE INDEX "ProductionLine_currentStatus_idx" ON "ProductionLine"("currentStatus");

-- CreateTable
CREATE TABLE "ProductionSalesOrder" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "orderDate" TEXT NOT NULL,
    "requiredDate" TEXT NOT NULL,
    "status" "ProductionSalesOrderStatus" NOT NULL DEFAULT 'draft',
    "priority" "ProductionOrderPriority" NOT NULL DEFAULT 'normal',
    "lines" JSONB NOT NULL DEFAULT '[]',
    "totalValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "confirmedAt" TEXT,
    "completedAt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionSalesOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductionSalesOrder_orderNumber_key" ON "ProductionSalesOrder"("orderNumber");

-- CreateIndex
CREATE INDEX "ProductionSalesOrder_status_idx" ON "ProductionSalesOrder"("status");

-- CreateIndex
CREATE INDEX "ProductionSalesOrder_customerId_idx" ON "ProductionSalesOrder"("customerId");

-- CreateTable
CREATE TABLE "ProductionWorkOrder" (
    "id" TEXT NOT NULL,
    "workOrderNumber" TEXT NOT NULL,
    "salesOrderId" TEXT,
    "salesOrderNumber" TEXT,
    "itemId" TEXT,
    "itemNameFa" TEXT,
    "itemSku" TEXT,
    "plannedQuantity" DOUBLE PRECISION NOT NULL,
    "actualQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scrapQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "uom" TEXT NOT NULL,
    "lineId" TEXT,
    "lineName" TEXT,
    "scheduledStart" TEXT,
    "scheduledEnd" TEXT,
    "actualStart" TEXT,
    "actualEnd" TEXT,
    "status" "ProductionWorkOrderStatus" NOT NULL DEFAULT 'planned',
    "priority" "ProductionOrderPriority" NOT NULL DEFAULT 'normal',
    "assignedShift" "ProductionShift",
    "supervisorId" TEXT,
    "supervisorName" TEXT,
    "bomId" TEXT,
    "estimatedDurationHours" DOUBLE PRECISION,
    "actualDurationHours" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionWorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductionWorkOrder_workOrderNumber_key" ON "ProductionWorkOrder"("workOrderNumber");

-- CreateIndex
CREATE INDEX "ProductionWorkOrder_status_idx" ON "ProductionWorkOrder"("status");

-- CreateIndex
CREATE INDEX "ProductionWorkOrder_lineId_idx" ON "ProductionWorkOrder"("lineId");

-- CreateIndex
CREATE INDEX "ProductionWorkOrder_salesOrderId_idx" ON "ProductionWorkOrder"("salesOrderId");

-- CreateTable
CREATE TABLE "ProductionBom" (
    "id" TEXT NOT NULL,
    "bomNumber" TEXT NOT NULL,
    "finishedItemId" TEXT,
    "finishedItemNameFa" TEXT,
    "finishedItemSku" TEXT,
    "version" TEXT NOT NULL DEFAULT 'v1.0',
    "status" "ProductionBomStatus" NOT NULL DEFAULT 'draft',
    "outputQuantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "outputUom" TEXT NOT NULL DEFAULT 'piece',
    "lines" JSONB NOT NULL DEFAULT '[]',
    "totalMaterialCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "processingCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "effectiveFrom" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionBom_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductionBom_bomNumber_key" ON "ProductionBom"("bomNumber");

-- CreateIndex
CREATE INDEX "ProductionBom_status_idx" ON "ProductionBom"("status");

-- CreateIndex
CREATE INDEX "ProductionBom_finishedItemId_idx" ON "ProductionBom"("finishedItemId");

-- CreateTable
CREATE TABLE "QualityCheck" (
    "id" TEXT NOT NULL,
    "checkNumber" TEXT NOT NULL,
    "workOrderId" TEXT,
    "workOrderNumber" TEXT,
    "itemId" TEXT,
    "itemNameFa" TEXT,
    "checkType" "ProductionCheckType" NOT NULL DEFAULT 'in_process',
    "sampleSize" INTEGER NOT NULL DEFAULT 0,
    "defectCount" INTEGER NOT NULL DEFAULT 0,
    "defectRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "result" "ProductionCheckResult" NOT NULL DEFAULT 'pending',
    "checkedBy" TEXT,
    "checkedAt" TEXT,
    "parameters" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QualityCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QualityCheck_checkNumber_key" ON "QualityCheck"("checkNumber");

-- CreateIndex
CREATE INDEX "QualityCheck_workOrderId_idx" ON "QualityCheck"("workOrderId");

-- CreateIndex
CREATE INDEX "QualityCheck_result_idx" ON "QualityCheck"("result");

-- CreateTable
CREATE TABLE "NonConformanceReport" (
    "id" TEXT NOT NULL,
    "ncrNumber" TEXT NOT NULL,
    "workOrderId" TEXT,
    "grnId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "severity" "NcrSeverity" NOT NULL DEFAULT 'minor',
    "status" "NcrStatus" NOT NULL DEFAULT 'open',
    "raisedBy" TEXT,
    "raisedAt" TEXT,
    "assignedTo" TEXT,
    "rootCause" TEXT,
    "correctiveAction" TEXT,
    "closedAt" TEXT,
    "closedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NonConformanceReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NonConformanceReport_ncrNumber_key" ON "NonConformanceReport"("ncrNumber");

-- CreateIndex
CREATE INDEX "NonConformanceReport_status_idx" ON "NonConformanceReport"("status");

-- CreateIndex
CREATE INDEX "NonConformanceReport_workOrderId_idx" ON "NonConformanceReport"("workOrderId");

-- CreateTable
CREATE TABLE "ScrapRecord" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT,
    "itemId" TEXT,
    "itemNameFa" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "uom" TEXT,
    "reason" "ScrapReason" NOT NULL DEFAULT 'other',
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recordedBy" TEXT,
    "recordedAt" TEXT,
    "disposalMethod" "ScrapDisposalMethod",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScrapRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScrapRecord_workOrderId_idx" ON "ScrapRecord"("workOrderId");
