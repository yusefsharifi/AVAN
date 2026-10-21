export class DispatchLetterDto {
  methods: ('EMAIL' | 'SMS' | 'PHYSICAL' | 'PORTAL')[];
  emailRecipients?: string[];
  smsRecipients?: string[];
  physicalTrackingNumber?: string;
  notes?: string;
}
