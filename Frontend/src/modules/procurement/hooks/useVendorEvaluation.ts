import { useMemo } from 'react';
import { useProcurementStore } from '../store/useProcurementStore';

export function useVendorEvaluation(vendorId: string) {
  const { vendors, purchaseOrders } = useProcurementStore();

  return useMemo(() => {
    const vendor = vendors.find((v) => v.id === vendorId);
    const vendorPOs = purchaseOrders.filter((po) => po.vendorId === vendorId);
    const performanceTrend = vendor?.performanceHistory.map((m) => ({
      period: m.period, onTime: m.onTimeDeliveryRate, quality: m.qualityAcceptanceRate, price: m.priceComplianceRate,
    })) ?? [];
    const spendTrend = vendor?.performanceHistory.map((m) => ({ period: m.period, spend: m.totalPurchaseValue })) ?? [];
    const itemCategoriesSupplied = Array.from(new Set(vendorPOs.flatMap((po) => po.lines.map((l) => l.itemSku))));

    // Recommended items: items this vendor has historically offered the lowest price for
    const priceByItem = new Map<string, { unitPrice: number; itemNameFa: string }>();
    vendorPOs.forEach((po) => po.lines.forEach((l) => {
      const existing = priceByItem.get(l.itemId);
      if (!existing || l.unitPrice < existing.unitPrice) priceByItem.set(l.itemId, { unitPrice: l.unitPrice, itemNameFa: l.itemNameFa });
    }));

    return {
      vendor, purchaseOrders: vendorPOs, performanceTrend, spendTrend, itemCategoriesSupplied,
      recommendedItems: Array.from(priceByItem.entries()).map(([itemId, v]) => ({ itemId, ...v })),
    };
  }, [vendors, purchaseOrders, vendorId]);
}
