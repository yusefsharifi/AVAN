import { LetterDirection, LetterType, LetterClassification, LetterPriority, TemplateCategory } from './create-letter.dto';

export class CreateLetterTemplateDto {
  zoneId?: string;
  code: string;
  nameFa: string;
  descriptionFa?: string;
  category: TemplateCategory;
  direction: LetterDirection;
  type: LetterType;
  classification?: LetterClassification;
  priority?: LetterPriority;
  subjectTemplate: string;
  bodyTemplate: string;
  salutationTemplate?: string;
  closingTemplate?: string;
  variables: { key: string; labelFa: string; source: string; sourcePath?: string; defaultValue?: string }[];
  defaultSlaHours?: number;
  approvalChainTemplate: { stepOrder: number; stepName: string; roleFa: string; type: string; isRequired: boolean; slaDays: number }[];
  autoTrigger?: { event: string; sourceModule: string; daysBeforeEvent?: number };
  tags?: string[];
}

export class UpdateLetterTemplateDto {
  nameFa?: string;
  descriptionFa?: string;
  subjectTemplate?: string;
  bodyTemplate?: string;
  salutationTemplate?: string;
  closingTemplate?: string;
  variables?: { key: string; labelFa: string; source: string; sourcePath?: string; defaultValue?: string }[];
  defaultSlaHours?: number;
  approvalChainTemplate?: { stepOrder: number; stepName: string; roleFa: string; type: string; isRequired: boolean; slaDays: number }[];
  autoTrigger?: { event: string; sourceModule: string; daysBeforeEvent?: number };
  tags?: string[];
  isActive?: boolean;
}

export class PreviewTemplateDto {
  templateCode: string;
  variables: Record<string, string>;
  zoneId?: string;
}
