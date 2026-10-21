import { useMemo } from 'react';
import { calculateDepreciation } from '../utils';
import type { DepreciationEntry } from '../types';

const MOCK_ASSETS = [
  { id: 'FA-001', code: 'FA-001', name: 'دستگاه تزریق پلاستیک ۱', cost: 5000000000, salvageValue: 500000000, usefulLife: 10, method: 'straight_line', netBookValue: 3500000000 },
  { id: 'FA-002', code: 'FA-002', name: 'کامیون حمل بار', cost: 2000000000, salvageValue: 200000000, usefulLife: 5, method: 'straight_line', netBookValue: 800000000 },
  { id: 'FA-003', code: 'FA-003', name: 'سیستم کامپیوتری', cost: 500000000, salvageValue: 50000000, usefulLife: 3, method: 'declining_balance', netBookValue: 120000000 },
];

export function useDepreciationSchedule() {
  const entries = useMemo<DepreciationEntry[]>(() => MOCK_ASSETS.map(a => ({
    id: a.id,
    assetId: a.id,
    assetCode: a.code,
    assetName: a.name,
    monthlyDepreciation: calculateDepreciation(a.method, a.cost, a.salvageValue, a.usefulLife, a.netBookValue),
    accumulatedDepreciation: a.cost - a.netBookValue,
    netBookValue: a.netBookValue,
  })), []);
  
  const totalMonthlyDepreciation = useMemo(() => entries.reduce((s, e) => s + e.monthlyDepreciation, 0), [entries]);
  const totalNetBookValue = useMemo(() => entries.reduce((s, e) => s + e.netBookValue, 0), [entries]);
  
  return { entries, totalMonthlyDepreciation, totalNetBookValue };
}
