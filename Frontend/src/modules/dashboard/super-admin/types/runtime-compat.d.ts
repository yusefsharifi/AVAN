// src/types/runtime-compat.d.ts
export {};

declare module '@/entities/zone' {
  interface IndustrialZone {
    /** legacy alias used in Task 0-4 stores */
    code?: string;
    name?: string;
    totalArea?: number;
    suspensionReason?: string;
  }
}
