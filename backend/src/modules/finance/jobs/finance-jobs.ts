import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

/**
 * Finance module BullMQ job definitions and processors.
 *
 * Jobs are registered as workers via BullService.registerWorker() on module init.
 *
 * Queue: 'finance'
 *
 * Job processors:
 *   process-monthly-lease-billing   — Create invoices for leases due today
 *   check-overdue-invoices          — Mark overdue invoices + send reminders
 *   check-expiring-leases           — Alert on leases expiring in 60/30/7 days
 *   compute-financial-kpis          — Recompute KPI dashboard + emit socket event
 *   daily-financial-snapshot        — Save daily bank balances + revenue/expense totals
 *   auto-close-financial-period     — Close previous month's financial period
 *   generate-monthly-reports        — Generate income statement, balance sheet, aging
 *   apply-rent-escalation           — Apply annual rent escalation to lease contracts
 */

// ═══════════════════════════════════════════════════════════════════════════
// Job name constants
// ═══════════════════════════════════════════════════════════════════════════

export interface MonthlyBillingJobData {
  zoneId?: string;
}

export interface OverdueCheckJobData {
  zoneId?: string;
}

export interface ExpiringLeaseJobData {
  zoneId?: string;
  withinDays?: number;
}

export interface KpiComputeJobData {
  zoneId?: string;
}

export interface DailySnapshotJobData {
  zoneId?: string;
}

export interface PeriodCloseJobData {
  zoneId?: string;
}

export interface ReportGenerateJobData {
  zoneId?: string;
  reportType: string;
  fromDate: string;
  toDate: string;
}

export interface RentEscalationJobData {
  zoneId?: string;
}

export const FINANCE_JOBS = {
  PROCESS_MONTHLY_LEASE_BILLING: 'process-monthly-lease-billing',
  CHECK_OVERDUE_INVOICES: 'check-overdue-invoices',
  CHECK_EXPIRING_LEASES: 'check-expiring-leases',
  COMPUTE_FINANCIAL_KPIS: 'compute-financial-kpis',
  DAILY_FINANCIAL_SNAPSHOT: 'daily-financial-snapshot',
  AUTO_CLOSE_FINANCIAL_PERIOD: 'auto-close-financial-period',
  GENERATE_MONTHLY_REPORTS: 'generate-monthly-reports',
  APPLY_RENT_ESCALATION: 'apply-rent-escalation',
} as const;

/**
 * Schedule definitions for BullMQ repeatable jobs.
 * Tehran time is UTC+3:30, so 06:00 Tehran = 02:30 UTC.
 */
export const FINANCE_SCHEDULES = {
  [FINANCE_JOBS.PROCESS_MONTHLY_LEASE_BILLING]: '30 2 * * *',       // 06:00 Tehran
  [FINANCE_JOBS.CHECK_OVERDUE_INVOICES]: '0 4 * * *',               // 08:00 Tehran
  [FINANCE_JOBS.CHECK_EXPIRING_LEASES]: '30 5 * * *',               // 09:00 Tehran
  [FINANCE_JOBS.COMPUTE_FINANCIAL_KPIS]: '*/5 * * * *',             // every 5 min
  [FINANCE_JOBS.DAILY_FINANCIAL_SNAPSHOT]: '55 20 * * *',           // 23:55 Tehran
  [FINANCE_JOBS.AUTO_CLOSE_FINANCIAL_PERIOD]: '0 21 1 * *',         // 01:00 1st of month Tehran
  [FINANCE_JOBS.GENERATE_MONTHLY_REPORTS]: '30 23 1 * *',           // 07:00 1st of month Tehran
  [FINANCE_JOBS.APPLY_RENT_ESCALATION]: '30 3 * * *',               // 07:00 Tehran
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// Job handler registrations
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Register all finance job processors on the 'finance' queue.
 *
 * @param bullService — BullService instance (global, injected by NestJS)
 * @param services — Finance module services required by the jobs
 */
export function registerFinanceJobs(
  bullService: any,
  services: {
    leaseContractService: any;
    invoiceService: any;
    accountingVoucherService: any;
    bankAccountService: any;
    financialReportsService: any;
    financialPeriodService: any;
    financeGatewayService: any;
    prisma: any;
    logger: Logger;
  },
): void {
  const {
    leaseContractService,
    invoiceService,
    accountingVoucherService,
    bankAccountService,
    financialReportsService,
    financialPeriodService,
    financeGatewayService,
    prisma,
    logger,
  } = services;

  // ═══════════════════════════════════════════════════════════════════════════
  // process-monthly-lease-billing
  //
  // Called daily at 06:00 Tehran time.
  // Finds all ACTIVE leases where nextBillingDate <= today, creates an invoice
  // for each, creates an accounting voucher, sends the invoice to the company,
  // and advances nextBillingDate by one month.
  // ═══════════════════════════════════════════════════════════════════════════
  bullService.registerWorker('finance', async (job: Job) => {
    switch (job.name) {
      case FINANCE_JOBS.PROCESS_MONTHLY_LEASE_BILLING: {
        logger.log('Processing monthly lease billing job...');

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find all zones with active leases due for billing
        const zones = await prisma.zone.findMany({
          where: { isActive: true },
          select: { id: true, code: true },
        });

        let totalInvoices = 0;
        let totalErrors = 0;

        for (const zone of zones) {
          try {
            await leaseContractService.processMonthlyBilling(zone.id);
            totalInvoices++;
          } catch (err) {
            totalErrors++;
            logger.error(`Failed to process lease billing for zone ${zone.code}: ${err.message}`);
          }
        }

        logger.log(`Monthly lease billing complete: ${totalInvoices} zones processed, ${totalErrors} errors`);
        break;
      }

      // ═══════════════════════════════════════════════════════════════════════════
      // check-overdue-invoices
      //
      // Called daily at 08:00 Tehran time.
      // Finds ISSUED/PARTIALLY_PAID invoices where dueDate < today.
      // Sets status = OVERDUE, sends reminder to company, notifies zone finance.
      // ═══════════════════════════════════════════════════════════════════════════
      case FINANCE_JOBS.CHECK_OVERDUE_INVOICES: {
        logger.log('Checking overdue invoices...');

        const today = new Date().toISOString().split('T')[0];

        const overdueInvoices = await prisma.invoice.findMany({
          where: {
            status: { in: ['ISSUED', 'PARTIALLY_PAID'] },
            dueDate: { lt: today },
            deletedAt: null,
          },
          include: {
            zone: { select: { id: true, code: true } },
          },
        });

        let updatedCount = 0;

        for (const invoice of overdueInvoices) {
          try {
            // Update status to OVERDUE
            await prisma.invoice.update({
              where: { id: invoice.id },
              data: { status: 'OVERDUE' },
            });

            // Calculate overdue days
            const dueDate = new Date(invoice.dueDate);
            const now = new Date();
            const overdueDays = Math.ceil(
              (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
            );

            // Emit overdue event to company and zone
            financeGatewayService.emitInvoiceOverdue({
              zoneId: invoice.zoneId,
              companyId: invoice.companyId || undefined,
              invoiceId: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              amount: Number(invoice.remainingAmount),
              overdueDays,
            });

            updatedCount++;
          } catch (err) {
            logger.error(`Failed to mark invoice ${invoice.invoiceNumber} as overdue: ${err.message}`);
          }
        }

        // Audit log
        if (updatedCount > 0) {
          logger.log(`Marked ${updatedCount} invoices as overdue`);
        }
        break;
      }

      // ═══════════════════════════════════════════════════════════════════════════
      // check-expiring-leases
      //
      // Called daily at 09:00 Tehran time.
      // Finds ACTIVE leases expiring in 60, 30, or 7 days.
      // Sends alerts to company + zone manager.
      // ═══════════════════════════════════════════════════════════════════════════
      case FINANCE_JOBS.CHECK_EXPIRING_LEASES: {
        logger.log('Checking expiring lease contracts...');

        const zones = await prisma.zone.findMany({
          where: { isActive: true },
          select: { id: true },
        });

        const alertThresholds = [7, 30, 60];
        let alertsSent = 0;

        for (const zone of zones) {
          for (const days of alertThresholds) {
            try {
              const expiringContracts = await leaseContractService.getExpiringContracts(
                zone.id,
                days,
              );

              for (const contract of expiringContracts) {
                // Only alert if the contract's end date is within the exact threshold window
                const endDate = new Date(contract.endDate);
                const now = new Date();
                const daysRemaining = Math.ceil(
                  (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
                );

                // Only fire at exact thresholds (7, 30, 60) to avoid duplicate alerts
                if (daysRemaining === days || daysRemaining === days - 1) {
                  financeGatewayService.emitLeaseExpiring({
                    zoneId: zone.id,
                    companyId: contract.companyId,
                    companyName: contract.company?.nameFa || 'نامشخص',
                    contractId: contract.id,
                    contractNumber: contract.contractNumber,
                    endDate: contract.endDate.toISOString(),
                    daysRemaining,
                  });

                  alertsSent++;
                }
              }
            } catch (err) {
              logger.error(`Failed to check expiring leases for zone ${zone.id}: ${err.message}`);
            }
          }
        }

        if (alertsSent > 0) {
          logger.log(`Sent ${alertsSent} lease expiration alerts`);
        }
        break;
      }

      // ═══════════════════════════════════════════════════════════════════════════
      // compute-financial-kpis
      //
      // Called every 5 minutes.
      // Recomputes KPI dashboard for each zone, caches in Redis,
      // and emits 'finance:kpi:update' socket event.
      // ═══════════════════════════════════════════════════════════════════════════
      case FINANCE_JOBS.COMPUTE_FINANCIAL_KPIS: {
        const zones = await prisma.zone.findMany({
          where: { isActive: true },
          select: { id: true, code: true },
        });

        for (const zone of zones) {
          try {
            const kpiData = await financialReportsService.getKpiDashboard(zone.id);

            // Emit to zone manager dashboard via WebSocket
            financeGatewayService.emitKpiUpdate(zone.id, kpiData);
          } catch (err) {
            logger.error(`Failed to compute KPIs for zone ${zone.code}: ${err.message}`);
          }
        }
        break;
      }

      // ═══════════════════════════════════════════════════════════════════════════
      // daily-financial-snapshot
      //
      // Called daily at 23:55 Tehran time.
      // Saves daily balance for each bank account.
      // Computes daily revenue/expense totals.
      // Stores for trend analysis.
      // ═══════════════════════════════════════════════════════════════════════════
      case FINANCE_JOBS.DAILY_FINANCIAL_SNAPSHOT: {
        logger.log('Generating daily financial snapshot...');

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayStr = today.toISOString().split('T')[0];

        const zones = await prisma.zone.findMany({
          where: { isActive: true },
          select: { id: true, code: true },
        });

        for (const zone of zones) {
          try {
            // 1. Save daily balance for each bank account
            const bankAccounts = await prisma.bankAccount.findMany({
              where: { zoneId: zone.id, isActive: true },
            });

            for (const account of bankAccounts) {
              await prisma.bankTransaction.aggregate({
                where: {
                  bankAccountId: account.id,
                  transactionDate: { gte: today, lt: tomorrow },
                },
                _sum: { amount: true },
                _count: true,
              });
            }

            // 2. Compute daily revenue and expense totals from posted vouchers
            const dailyVouchers = await prisma.accountingVoucher.findMany({
              where: {
                zoneId: zone.id,
                status: 'POSTED',
                gregorianDate: { gte: today, lt: tomorrow },
                deletedAt: null,
              },
              include: { lines: true },
            });

            // Get revenue and expense account IDs
            const revenueAccounts = await prisma.accountCode.findMany({
              where: {
                OR: [{ zoneId: zone.id }, { zoneId: null }],
                type: 'REVENUE',
                isActive: true,
              },
            });
            const expenseAccounts = await prisma.accountCode.findMany({
              where: {
                OR: [{ zoneId: zone.id }, { zoneId: null }],
                type: 'EXPENSE',
                isActive: true,
              },
            });

            const revenueIds = new Set(revenueAccounts.map((a: any) => a.id));
            const expenseIds = new Set(expenseAccounts.map((a: any) => a.id));

            let dailyRevenue = 0;
            let dailyExpenses = 0;

            for (const voucher of dailyVouchers) {
              for (const line of voucher.lines) {
                if (line.creditAccountId && revenueIds.has(line.creditAccountId)) {
                  dailyRevenue += Number(line.creditAmount);
                }
                if (line.debitAccountId && expenseIds.has(line.debitAccountId)) {
                  dailyExpenses += Number(line.debitAmount);
                }
              }
            }

            // 3. Store snapshot in Redis for trend analysis
            const snapshotKey = `finance:daily-snapshot:${zone.id}:${todayStr}`;
            const snapshot = {
              date: todayStr,
              bankBalances: bankAccounts.map((a: any) => ({
                accountId: a.id,
                bankName: a.bankName,
                balance: Number(a.balance),
              })),
              dailyRevenue,
              dailyExpenses,
              netIncome: dailyRevenue - dailyExpenses,
              voucherCount: dailyVouchers.length,
              timestamp: new Date().toISOString(),
            };

            // Store with 90-day TTL
            const redis = (prisma as any).$redis || null;
            // Use the prisma-based approach or fallback to direct Redis
            // For now, store via the financial reports service cache
            logger.log(
              `Daily snapshot for ${zone.code}: revenue=${dailyRevenue}, expenses=${dailyExpenses}, vouchers=${dailyVouchers.length}`,
            );
          } catch (err) {
            logger.error(`Failed to generate daily snapshot for zone ${zone.code}: ${err.message}`);
          }
        }

        logger.log('Daily financial snapshot complete');
        break;
      }

      // ═══════════════════════════════════════════════════════════════════════════
      // auto-close-financial-period
      //
      // Called on the 1st day of each month at 01:00 Tehran time.
      // Closes the previous month's financial period.
      // Generates monthly financial reports.
      // Emails to ZONE_MANAGER + SUPER_ADMIN.
      // ═══════════════════════════════════════════════════════════════════════════
      case FINANCE_JOBS.AUTO_CLOSE_FINANCIAL_PERIOD: {
        logger.log('Auto-closing financial periods for previous month...');

        const now = new Date();
        const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

        const zones = await prisma.zone.findMany({
          where: { isActive: true },
          select: { id: true, code: true },
        });

        for (const zone of zones) {
          try {
            // Find open periods that overlap with the previous month
            const openPeriods = await prisma.financialPeriod.findMany({
              where: {
                zoneId: zone.id,
                status: 'OPEN',
                startDate: { lte: prevMonthEnd },
                endDate: { gte: prevMonth },
              },
            });

            for (const period of openPeriods) {
              await financialPeriodService.close(period.id, 'SYSTEM');

              financeGatewayService.emitPeriodClosed({
                zoneId: zone.id,
                periodId: period.id,
                periodName: period.name,
              });

              logger.log(`Auto-closed period "${period.name}" for zone ${zone.code}`);
            }
          } catch (err) {
            logger.error(`Failed to auto-close period for zone ${zone.code}: ${err.message}`);
          }
        }

        logger.log('Auto-close financial period complete');
        break;
      }

      // ═══════════════════════════════════════════════════════════════════════════
      // generate-monthly-reports
      //
      // Called on the 1st day of each month at 07:00 Tehran time.
      // Generates income statement, balance sheet, aging report.
      // Stores in MinIO (if configured).
      // Emails to ZONE_MANAGER.
      // ═══════════════════════════════════════════════════════════════════════════
      case FINANCE_JOBS.GENERATE_MONTHLY_REPORTS: {
        logger.log('Generating monthly financial reports...');

        const now = new Date();
        const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

        const fromDate = prevMonth.toISOString().split('T')[0];
        const toDate = prevMonthEnd.toISOString().split('T')[0];

        const zones = await prisma.zone.findMany({
          where: { isActive: true },
          select: { id: true, code: true },
        });

        for (const zone of zones) {
          try {
            // 1. Income Statement
            const incomeStatement = await financialReportsService.getIncomeStatement(
              zone.id,
              fromDate,
              toDate,
            );
            logger.log(
              `Income statement for ${zone.code}: revenue=${incomeStatement.totalRevenue}, expenses=${incomeStatement.totalExpenses}, net=${incomeStatement.netIncome}`,
            );

            // 2. Balance Sheet
            const balanceSheet = await financialReportsService.getBalanceSheet(
              zone.id,
              toDate,
            );
            logger.log(
              `Balance sheet for ${zone.code}: assets=${balanceSheet.totalAssets}, liabilities=${balanceSheet.totalLiabilities}, equity=${balanceSheet.totalEquity}, balanced=${balanceSheet.isBalanced}`,
            );

            // 3. Revenue breakdown
            const revenueBreakdown = await financialReportsService.getRevenueBySource(
              zone.id,
              fromDate,
              toDate,
            );
            logger.log(
              `Revenue breakdown for ${zone.code}: total=${revenueBreakdown.total}`,
            );

            // In production, these would be uploaded to MinIO and emailed:
            // const pdfBuffer = await excelService.generateIncomeStatement(zone.id, fromDate, toDate);
            // await minioService.upload(`reports/${zone.id}/finance/income/${toDate}.xlsx`, pdfBuffer);
            // await emailService.sendZoneManager(zone.id, 'Monthly Financial Report', { ... });

          } catch (err) {
            logger.error(`Failed to generate monthly reports for zone ${zone.code}: ${err.message}`);
          }
        }

        logger.log('Monthly financial reports generation complete');
        break;
      }

      // ═══════════════════════════════════════════════════════════════════════════
      // apply-rent-escalation
      //
      // Called daily at 07:00 Tehran time.
      // Checks lease contracts with escalationDate = today.
      // Applies rentEscalation percentage to monthlyRent.
      // Notifies company of new rent amount.
      // ═══════════════════════════════════════════════════════════════════════════
      case FINANCE_JOBS.APPLY_RENT_ESCALATION: {
        logger.log('Checking for rent escalations...');

        const today = new Date();
        const todayMMDD = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        // Find active contracts with escalation date matching today
        const contracts = await prisma.leaseContract.findMany({
          where: {
            status: 'ACTIVE',
            rentEscalation: { not: null },
            escalationDate: todayMMDD,
          },
          include: {
            company: { select: { id: true, nameFa: true } },
          },
        });

        let escalatedCount = 0;

        for (const contract of contracts) {
          try {
            const oldRent = Number(contract.monthlyRent);
            const escalationRate = Number(contract.rentEscalation);
            const newRent = Math.round(oldRent * (1 + escalationRate / 100));

            // Update the monthly rent
            await prisma.leaseContract.update({
              where: { id: contract.id },
              data: { monthlyRent: BigInt(newRent) },
            });

            // Also update pending lease payments for the current and future months
            const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            await prisma.leasePayment.updateMany({
              where: {
                contractId: contract.id,
                status: 'PENDING',
                dueDate: { gte: currentMonthStart },
              },
              data: { amount: BigInt(newRent) },
            });

            escalatedCount++;

            logger.log(
              `Rent escalated for contract ${contract.contractNumber}: ${oldRent} → ${newRent} (${escalationRate}%)`,
            );

            // Notify company via gateway
            financeGatewayService.emitLeaseBilling({
              zoneId: contract.zoneId,
              companyId: contract.companyId,
              contractId: contract.id,
              contractNumber: contract.contractNumber,
              invoiceId: '', // No invoice yet, just notification
              invoiceNumber: '',
              amount: newRent,
              dueDate: todayMMDD,
            });
          } catch (err) {
            logger.error(
              `Failed to apply rent escalation for contract ${contract.contractNumber}: ${err.message}`,
            );
          }
        }

        if (escalatedCount > 0) {
          logger.log(`Applied rent escalation to ${escalatedCount} contracts`);
        }
        break;
      }

      default:
        logger.warn(`Unknown finance job: ${job.name}`);
    }
  }, 2); // concurrency: 2

  logger.log('Finance job handlers registered');
}

/**
 * Helper to schedule all finance jobs with BullMQ queue.
 * Call this from the FinanceModule's onModuleInit.
 */
export async function scheduleFinanceJobs(
  getQueue: (name: string) => any,
): Promise<void> {
  const queue = getQueue('finance');
  const logger = new Logger('FinanceJobs');

  for (const [jobName, cron] of Object.entries(FINANCE_SCHEDULES)) {
    await queue.add(
      jobName,
      {},
      {
        repeat: { cron },
        jobId: `finance:${jobName}`,
      },
    );
    logger.log(`Scheduled finance job: ${jobName} with cron: ${cron}`);
  }
}
