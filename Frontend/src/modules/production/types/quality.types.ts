export type QCResult = 'pass' | 'fail' | 'conditional' | 'pending';
export type NCRStatus = 'open' | 'under_review' | 'corrective_action' | 'closed' | 'rejected';

export interface QualityCheck {
  id: string;
  checkNumber: string;
  workOrderId: string;
  workOrderNumber: string;
  itemId: string;
  itemNameFa: string;
  checkType: 'incoming' | 'in_process' | 'final' | 'outgoing';
  sampleSize: number;
  defectCount: number;
  defectRate: number;
  result: QCResult;
  checkedBy: string;
  checkedAt: string;
  parameters: { name: string; unit: string; target: number; actual: number; tolerance: number; pass: boolean }[];
  notes: string;
  attachments: string[];
}

export interface NCR {
  id: string;
  ncrNumber: string;
  workOrderId?: string;
  grnId?: string;
  title: string;
  description: string;
  severity: 'minor' | 'major' | 'critical';
  status: NCRStatus;
  raisedBy: string;
  raisedAt: string;
  assignedTo?: string;
  rootCause?: string;
  correctiveAction?: string;
  closedAt?: string;
  closedBy?: string;
}

export interface ScrapRecord {
  id: string;
  workOrderId: string;
  itemId: string;
  itemNameFa: string;
  quantity: number;
  uom: string;
  reason: 'defect' | 'setup_waste' | 'trial_run' | 'material_issue' | 'machine_issue' | 'other';
  cost: number;
  recordedBy: string;
  recordedAt: string;
  disposalMethod: 'recycled' | 'rework' | 'disposal' | 'vendor_return';
}
