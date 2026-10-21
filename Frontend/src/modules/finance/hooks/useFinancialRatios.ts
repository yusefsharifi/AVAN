import { useMemo } from 'react';
import { useFinanceStore } from '../store';
import type { FinancialRatio } from '../types';

export function useFinancialRatios() {
  const { getFinancialStats } = useFinanceStore();
  const stats = getFinancialStats();
  
  const ratios = useMemo<FinancialRatio[]>(() => [
    { name: 'current_ratio', nameFa: 'نسبت جاری', value: stats.totalAssets > 0 ? stats.totalAssets / stats.totalLiabilities : 0, benchmark: 1.5, status: 'good', trend: 'stable' },
    { name: 'debt_to_equity', nameFa: 'نسبت بدهی به حقوق', value: stats.totalEquity > 0 ? stats.totalLiabilities / stats.totalEquity : 0, benchmark: 1.0, status: 'warning', trend: 'stable' },
    { name: 'net_margin', nameFa: 'حاشیه سود خالص', value: stats.totalRevenue > 0 ? (stats.netIncome / stats.totalRevenue) * 100 : 0, benchmark: 15, status: 'good', trend: 'improving' },
    { name: 'roa', nameFa: 'بازده دارایی', value: stats.totalAssets > 0 ? (stats.netIncome / stats.totalAssets) * 100 : 0, benchmark: 5, status: 'warning', trend: 'stable' },
    { name: 'roe', nameFa: 'بازده حقوق صاحبان سهام', value: stats.totalEquity > 0 ? (stats.netIncome / stats.totalEquity) * 100 : 0, benchmark: 10, status: 'good', trend: 'improving' },
  ], [stats]);
  
  return { ratios, stats };
}
