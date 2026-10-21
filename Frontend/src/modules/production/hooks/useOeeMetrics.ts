import { useMemo } from 'react';
import { useProductionStore } from '../store/useProductionStore';
import { calculateOEE } from '../utils';

export function useOeeMetrics() {
  const { machines, productionLines } = useProductionStore();

  return useMemo(() => {
    const overallOEE = productionLines.length
      ? Math.round((productionLines.reduce((s, l) => s + l.oee, 0) / productionLines.length) * 10) / 10
      : 0;

    const byLine = productionLines.map((l) => ({ id: l.id, nameFa: l.nameFa, oee: l.oee }));

    const byMachine = machines.map((m) => ({
      id: m.id, nameFa: m.nameFa,
      availability: m.oeeAvailability, performance: m.oeePerformance, quality: m.oeeQuality,
      oee: calculateOEE(m.oeeAvailability, m.oeePerformance, m.oeeQuality),
    }));

    // Mock 7-day trend: fluctuate ±4 points around each line's current OEE for chart display
    const trend = Array.from({ length: 7 }, (_, i) => {
      const point: Record<string, number | string> = { day: `روز ${i + 1}` };
      productionLines.forEach((l) => {
        const wiggle = Math.sin(i * 1.3 + l.nameFa.length) * 4;
        point[l.nameFa] = Math.max(0, Math.min(100, Math.round(l.oee + wiggle)));
      });
      return point;
    });

    return { overallOEE, byLine, byMachine, trend };
  }, [machines, productionLines]);
}
