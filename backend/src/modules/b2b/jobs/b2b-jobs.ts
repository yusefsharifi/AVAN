import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

/**
 * B2B Exchange job handlers for BullMQ queue.
 *
 * Jobs:
 *   close-rfq-on-deadline          — Auto-close RFQ when deadline passes
 *   rfq-deadline-reminder          — Send reminder to suppliers before deadline
 *   notify-invited-suppliers       — Send SMS/email to invited suppliers
 *   auto-evaluate-bids             — Auto-evaluate bids after RFQ closes
 *   failed-rfq-detection           — Detect CLOSED RFQs with 0 bids
 *   update-supplier-rankings       — Daily recalculation of supplier stats
 *   catalog-cleanup                — Monthly cleanup of stale products
 *   generate-award-letter          — Generate award letter via M7
 *   generate-rejection-letter      — Generate rejection letter via M7
 *   create-proforma-from-award     — Create proforma via M13 bridge
 */

export function registerB2bJobs(bullService: any, services: {
  rfqService: any;
  bidEvaluationService: any;
  supplierProfileService: any;
  productCatalogService: any;
  prisma: any;
  logger: Logger;
}): void {
  const { rfqService, bidEvaluationService, supplierProfileService, productCatalogService, prisma, logger } = services;

  // ═══════════════════════════════════════════════════════════════════════════
  // close-rfq-on-deadline
  // ═══════════════════════════════════════════════════════════════════════════
  bullService.registerWorker('b2b-exchange', async (job: Job) => {
    switch (job.name) {
      case 'close-rfq-on-deadline': {
        const { rfqId } = job.data;
        logger.log(`Processing close-rfq-on-deadline for RFQ ${rfqId}`);
        try {
          await rfqService.close(rfqId, 'SYSTEM');
          logger.log(`RFQ ${rfqId} closed successfully on deadline`);
        } catch (err) {
          logger.error(`Failed to close RFQ ${rfqId}: ${err.message}`);
        }
        break;
      }

      case 'rfq-deadline-reminder': {
        const { rfqId, hoursRemaining } = job.data;
        logger.log(`Processing deadline reminder for RFQ ${rfqId} (${hoursRemaining}h remaining)`);
        // The reminder is handled via gateway notification in the service
        break;
      }

      case 'notify-invited-suppliers': {
        const { rfqId, rfqNumber, title, supplierId, submissionDeadline } = job.data;
        logger.log(`Notifying supplier ${supplierId} about RFQ ${rfqNumber}`);
        // In production, this would send SMS + email via NotificationHub (M9)
        // await notificationHub.send({ ... });
        break;
      }

      case 'auto-evaluate-bids': {
        const { rfqId } = job.data;
        logger.log(`Auto-evaluating bids for RFQ ${rfqId}`);
        try {
          const results = await bidEvaluationService.autoEvaluate(rfqId);
          logger.log(`Auto-evaluation complete for RFQ ${rfqId}: ${results.length} bids evaluated`);
        } catch (err) {
          logger.error(`Failed to auto-evaluate RFQ ${rfqId}: ${err.message}`);
        }
        break;
      }

      case 'failed-rfq-detection': {
        // Find CLOSED RFQs with 0 valid bids
        const failedRfqs = await prisma.rFQ.findMany({
          where: {
            status: 'UNDER_EVALUATION',
            deletedAt: null,
          },
        });

        for (const rfq of failedRfqs) {
          const bidCount = await prisma.bid.count({
            where: {
              rfqId: rfq.id,
              status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED'] },
            },
          });

          if (bidCount === 0) {
            await prisma.rFQ.update({
              where: { id: rfq.id },
              data: { status: 'FAILED' },
            });
            logger.log(`RFQ ${rfq.rfqNumber} marked as FAILED (no valid bids)`);
          }
        }
        break;
      }

      case 'update-supplier-rankings': {
        logger.log('Running daily supplier ranking update...');
        try {
          // Find all active supplier profiles
          const profiles = await prisma.supplierProfile.findMany({
            where: { isActive: true },
          });

          for (const profile of profiles) {
            // Recalculate winRate from actual bid data
            const totalBids = await prisma.bid.count({
              where: { supplierId: profile.companyId },
            });

            const wonBids = await prisma.bid.count({
              where: { supplierId: profile.companyId, isWinner: true },
            });

            const winRate = totalBids > 0 ? (wonBids / totalBids) * 100 : 0;

            // Recalculate avgDeliveryScore from reviews
            const reviews = await prisma.bidReview.findMany({
              where: { supplierId: profile.companyId },
            });

            const avgDelivery =
              reviews.length > 0
                ? reviews.reduce((sum: number, r: any) => sum + r.deliveryScore, 0) / reviews.length
                : 0;

            await prisma.supplierProfile.update({
              where: { id: profile.id },
              data: {
                totalBidsPlaced: totalBids,
                totalWonBids: wonBids,
                winRate,
                avgDeliveryScore: Math.round(avgDelivery * 100) / 100,
                reviewCount: reviews.length,
              },
            });
          }

          logger.log(`Updated rankings for ${profiles.length} suppliers`);
        } catch (err) {
          logger.error(`Failed to update supplier rankings: ${err.message}`);
        }
        break;
      }

      case 'catalog-cleanup': {
        logger.log('Running monthly catalog cleanup...');
        try {
          // Mark products with 0 availability as unavailable
          // Archive products not updated in 1 year
          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

          const staleProducts = await prisma.productCatalog.findMany({
            where: {
              isAvailable: true,
              updatedAt: { lt: oneYearAgo },
            },
          });

          for (const product of staleProducts) {
            await prisma.productCatalog.update({
              where: { id: product.id },
              data: { isAvailable: false },
            });
          }

          logger.log(`Catalog cleanup: marked ${staleProducts.length} stale products as unavailable`);
        } catch (err) {
          logger.error(`Failed to run catalog cleanup: ${err.message}`);
        }
        break;
      }

      case 'generate-award-letter': {
        const { rfqId, winningBidId, rfqNumber } = job.data;
        logger.log(`Generating award letter for RFQ ${rfqNumber}`);
        // In production, this would call M7 Correspondence to generate letter
        // await correspondenceService.generateLetter({ template: 'B2B_AWARD', ... });
        break;
      }

      case 'generate-rejection-letter': {
        const { rfqId, rfqNumber, supplierId, supplierName } = job.data;
        logger.log(`Generating rejection letter for ${supplierName} on RFQ ${rfqNumber}`);
        // In production, this would call M7 Correspondence to generate letter
        // await correspondenceService.generateLetter({ template: 'B2B_REJECTION', ... });
        break;
      }

      case 'create-proforma-from-award': {
        const { rfqId, winningBidId, transactionId, rfqNumber } = job.data;
        logger.log(`Creating proforma from award for RFQ ${rfqNumber}`);
        // In production, this would call M13 Commercial module bridge
        // import { bidToProforma } from '@/modules/commercial/utils/bridges/toB2B';
        // const proformaData = bidToProforma(rfq, winningBid);
        // const proforma = commercialStore.createProforma(proformaData);
        // await prisma.rFQ.update({ where: { id: rfqId }, data: { poId: proforma.id } });
        // await prisma.b2BTransaction.update({ where: { id: transactionId }, data: { proformaId: proforma.id, status: 'PROFORMA_CREATED' } });
        break;
      }

      default:
        logger.warn(`Unknown B2B job: ${job.name}`);
    }
  }, 2); // concurrency: 2

  logger.log('B2B Exchange job handlers registered');
}
