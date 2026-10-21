type ZoneEvent =
    | { type: 'COMPANY_CREATED'; payload: { companyId: string; companyName: string } }
    | { type: 'ALERT_TRIGGERED'; payload: { alertId: string; severity: string } }
    | { type: 'INVOICE_ISSUED'; payload: { invoiceId: string; companyId: string; amount: number } }
    | { type: 'INCIDENT_CREATED'; payload: { incidentId: string; companyId: string; severity: string } }
    | { type: 'PTW_APPROVED'; payload: { ptwId: string; companyId: string } }
    | { type: 'LEASE_ACTIVATED'; payload: { leaseId: string; companyId: string } };

class ZoneEventBus {
    private listeners: Map<string, Set<(event: ZoneEvent) => void>> = new Map();

    emit(event: ZoneEvent) {
        const typeListeners = this.listeners.get(event.type);
        typeListeners?.forEach((cb) => cb(event));
    }

    on(type: ZoneEvent['type'], callback: (event: ZoneEvent) => void) {
        if (!this.listeners.has(type)) this.listeners.set(type, new Set());
        this.listeners.get(type)!.add(callback);
        return () => this.listeners.get(type)!.delete(callback);
    }
}

export const zoneEventBus = new ZoneEventBus();
