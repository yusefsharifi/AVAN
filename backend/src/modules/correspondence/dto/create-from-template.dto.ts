import { RecipientDto } from './create-letter.dto';

export class CreateLetterFromTemplateDto {
  zoneId: string;
  companyId?: string;
  templateCode: string;
  variables: Record<string, string>;
  additionalRecipients?: RecipientDto[];
  internalNotes?: string;
  autoSubmit?: boolean;
}
