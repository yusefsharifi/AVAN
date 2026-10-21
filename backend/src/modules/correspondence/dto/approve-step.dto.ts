export class ApproveLetterStepDto {
  stepOrder: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED';
  comment?: string;
  signatureKey?: string;
}
