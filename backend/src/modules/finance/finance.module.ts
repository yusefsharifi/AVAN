import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { AccountCodeService } from './services/account-code.service';
import { AccountingVoucherService } from './services/accounting-voucher.service';
import { InvoiceService } from './services/invoice.service';
import { LeaseContractService } from './services/lease-contract.service';
import { BankAccountService } from './services/bank-account.service';
import { FinancialReportsService } from './services/financial-reports.service';
import { BudgetService } from './services/budget.service';
import { FinancialPeriodService } from './services/financial-period.service';
import { InvoicePdfService } from './services/invoice-pdf.service';
import { FinancialReportExcelService } from './services/financial-report-excel.service';
import { FinanceGatewayService } from './services/finance-gateway.service';
import { GatewayModule } from '../../gateway/gateway.module';
import { RolesModule } from '../roles/roles.module';
import { BullService } from '../../bull/bull.service';
import { PrismaService } from '../../prisma/prisma.service';
import { VoucherController } from './controllers/voucher.controller';
import { InvoiceController } from './controllers/invoice.controller';
import { LeaseController } from './controllers/lease.controller';
import { BankAccountController } from './controllers/bank-account.controller';
import { AccountCodeController } from './controllers/account-code.controller';
import { BudgetController } from './controllers/budget.controller';
import { ReportsController } from './controllers/reports.controller';
import { PeriodController } from './controllers/period.controller';
import { FixedAssetController } from './controllers/fixed-asset.controller';
import { FinanceDocumentController } from './controllers/finance-document.controller';
import { BuyerSellerController } from './controllers/buyer-seller.controller';
import { FinanceVisitorController } from './controllers/finance-visitor.controller';
import { FinanceCheckbookController } from './controllers/finance-checkbook.controller';
import { FinanceCheckController } from './controllers/finance-check.controller';
import { FinanceReceiptPaymentController } from './controllers/finance-receipt-payment.controller';
import { FixedAssetService } from './services/fixed-asset.service';
import { FinanceDocumentService } from './services/finance-document.service';
import { BuyerSellerService } from './services/buyer-seller.service';
import { FinanceVisitorService } from './services/finance-visitor.service';
import { FinanceCheckbookService } from './services/finance-checkbook.service';
import { FinanceCheckService } from './services/finance-check.service';
import { FinanceReceiptPaymentService } from './services/finance-receipt-payment.service';

// Jobs
import { registerFinanceJobs } from './jobs/finance-jobs';

@Module({
  imports: [GatewayModule, RolesModule],
  controllers: [
    VoucherController,
    InvoiceController,
    LeaseController,
    BankAccountController,
    AccountCodeController,
    BudgetController,
    ReportsController,
    PeriodController,
    FixedAssetController,
    FinanceDocumentController,
    BuyerSellerController,
    FinanceVisitorController,
    FinanceCheckbookController,
    FinanceCheckController,
    FinanceReceiptPaymentController,
  ],
  providers: [
    AccountCodeService,
    AccountingVoucherService,
    InvoiceService,
    InvoicePdfService,
    LeaseContractService,
    BankAccountService,
    FinancialReportsService,
    FinancialReportExcelService,
    FinanceGatewayService,
    BudgetService,
    FinancialPeriodService,
    FixedAssetService,
    FinanceDocumentService,
    BuyerSellerService,
    FinanceVisitorService,
    FinanceCheckbookService,
    FinanceCheckService,
    FinanceReceiptPaymentService,
  ],
  exports: [
    AccountCodeService,
    AccountingVoucherService,
    InvoiceService,
    InvoicePdfService,
    LeaseContractService,
    BankAccountService,
    FinancialReportsService,
    FinancialReportExcelService,
    FinanceGatewayService,
    BudgetService,
    FinancialPeriodService,
    FixedAssetService,
    FinanceDocumentService,
    BuyerSellerService,
    FinanceVisitorService,
    FinanceCheckbookService,
    FinanceCheckService,
    FinanceReceiptPaymentService,
  ],
})
export class FinanceModule implements OnModuleInit {
  private readonly logger = new Logger(FinanceModule.name);

  constructor(
    private readonly bull: BullService,
    private readonly leaseContractService: LeaseContractService,
    private readonly invoiceService: InvoiceService,
    private readonly accountingVoucherService: AccountingVoucherService,
    private readonly bankAccountService: BankAccountService,
    private readonly financialReportsService: FinancialReportsService,
    private readonly financialPeriodService: FinancialPeriodService,
    private readonly financeGatewayService: FinanceGatewayService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    // Register Finance BullMQ job handlers
    registerFinanceJobs(this.bull, {
      leaseContractService: this.leaseContractService,
      invoiceService: this.invoiceService,
      accountingVoucherService: this.accountingVoucherService,
      bankAccountService: this.bankAccountService,
      financialReportsService: this.financialReportsService,
      financialPeriodService: this.financialPeriodService,
      financeGatewayService: this.financeGatewayService,
      prisma: this.prisma,
      logger: this.logger,
    });

    this.logger.log('Finance module initialized with job processors');
  }
}
