import type { InventoryItem } from '../types';

export interface ItemValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateItemForm(
  item: Partial<InventoryItem>,
  visibleTabs: string[],
): ItemValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!item.nameFa?.trim()) {
    errors.push('نام فارسی کالا الزامی است.');
  }

  if (!item.sku?.trim()) {
    errors.push('SKU الزامی است.');
  }

  if (visibleTabs.includes('physical')) {
    if (
      item.netWeightKg != null &&
      item.grossWeightKg != null &&
      item.netWeightKg > item.grossWeightKg
    ) {
      errors.push('وزن خالص نمی‌تواند بیشتر از وزن ناخالص باشد.');
    }

    if (item.hazardous && !item.storageRequirements?.msdsDocumentId) {
      warnings.push('برای کالای خطرناک، بارگذاری MSDS توصیه می‌شود.');
    }
  }

  if (visibleTabs.includes('inventory')) {
    const min = item.minStockLevel ?? 0;
    const max = item.maxStockLevel ?? 0;
    const reorder = item.reorderPoint ?? 0;
    const safety = item.safetyStock ?? 0;

    if (min > max) {
      errors.push('حداقل موجودی نمی‌تواند بیشتر از حداکثر موجودی باشد.');
    }

    if (reorder > max) {
      errors.push('نقطه سفارش نمی‌تواند بیشتر از حداکثر موجودی باشد.');
    }

    if (safety > reorder) {
      warnings.push('موجودی ایمنی بیشتر از نقطه سفارش است.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
