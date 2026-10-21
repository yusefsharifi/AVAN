import { IsOptional, IsString, IsEnum, IsArray, IsObject, IsUUID, IsDateString, IsUrl, IsBoolean, IsInt, Min, MaxLength } from 'class-validator';
import { NotificationModule, NotificationPriority, ChannelType } from '@prisma/client';

export class SendNotificationDto {
  @IsOptional() @IsUUID() zoneId?: string;
  @IsOptional() @IsUUID() companyId?: string;
  @IsOptional() @IsUUID() recipientId?: string;
  @IsOptional() @IsString() recipientRole?: string;
  @IsOptional() @IsString() recipientGroupId?: string;
  @IsEnum(NotificationModule) module!: NotificationModule;
  @IsString() eventType!: string;
  @IsEnum(NotificationPriority) priority!: NotificationPriority;
  @IsString() @MaxLength(200) title!: string;
  @IsString() @MaxLength(200) titleFa!: string;
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsString() bodyFa?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsString() actionUrl?: string;
  @IsOptional() @IsString() actionLabelFa?: string;
  @IsOptional() @IsString() entityType?: string;
  @IsOptional() @IsUUID() entityId?: string;
  @IsOptional() @IsArray() @IsEnum(ChannelType, { each: true }) channels?: ChannelType[];
  @IsOptional() @IsDateString() scheduledAt?: string;
  @IsOptional() @IsDateString() expiresAt?: string;
  @IsOptional() @IsString() groupKey?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsString() templateCode?: string;
  @IsOptional() @IsObject() templateVariables?: Record<string, string>;
}

export class SendSmsDto {
  @IsString() phone!: string;
  @IsString() @MaxLength(160) message!: string;
  @IsOptional() @IsString() templateId?: string;
  @IsOptional() @IsObject() templateParams?: Record<string, string>;
}

export class SendEmailDto {
  @IsString() to!: string;
  @IsString() subject!: string;
  @IsString() htmlBody!: string;
  @IsOptional() @IsString() textBody?: string;
  @IsOptional() @IsArray() attachments?: EmailAttachmentDto[];
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() replyTo?: string;
}

export class EmailAttachmentDto {
  @IsString() filename!: string;
  @IsString() content!: string;
  @IsString() contentType!: string;
}

export class SendPushDto {
  @IsArray() @IsString({ each: true }) tokens!: string[];
  @IsString() title!: string;
  @IsString() body!: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsString() actionUrl?: string;
  @IsOptional() @IsObject() data?: Record<string, string>;
  @IsOptional() @IsString() sound?: string;
  @IsOptional() @IsInt() badge?: number;
}

export class UpdateNotificationPreferenceDto {
  @IsOptional() @IsBoolean() allEnabled?: boolean;
  @IsOptional() @IsBoolean() inAppEnabled?: boolean;
  @IsOptional() @IsBoolean() smsEnabled?: boolean;
  @IsOptional() @IsBoolean() emailEnabled?: boolean;
  @IsOptional() @IsBoolean() pushEnabled?: boolean;
  @IsOptional() @IsBoolean() webPushEnabled?: boolean;
  @IsOptional() @IsObject() modulePrefs?: Record<string, { inApp?: boolean; sms?: boolean; email?: boolean; push?: boolean }>;
  @IsOptional() @IsBoolean() dndEnabled?: boolean;
  @IsOptional() @IsString() dndStartTime?: string;
  @IsOptional() @IsString() dndEndTime?: string;
  @IsOptional() @IsArray() @IsInt({ each: true }) dndDays?: number[];
  @IsOptional() @IsBoolean() digestEnabled?: boolean;
  @IsOptional() @IsString() digestFrequency?: string;
  @IsOptional() @IsString() digestTime?: string;
  @IsOptional() @IsString() emailAddress?: string;
}

export class RegisterPushTokenDto {
  @IsString() token!: string;
  @IsString() platform!: string;
  @IsOptional() @IsString() deviceInfo?: string;
}

export class CreateWebhookEndpointDto {
  @IsString() url!: string;
  @IsArray() @IsString({ each: true }) events!: string[];
  @IsOptional() @IsString() secret?: string;
}

export class FilterNotificationsDto {
  @IsOptional() @IsEnum(NotificationModule) module?: NotificationModule;
  @IsOptional() @IsString() eventType?: string;
  @IsOptional() @IsEnum(NotificationPriority) priority?: NotificationPriority;
  @IsOptional() @IsBoolean() isRead?: boolean;
  @IsOptional() @IsBoolean() isDismissed?: boolean;
  @IsOptional() @IsString() entityType?: string;
  @IsOptional() @IsUUID() entityId?: string;
  @IsOptional() @IsDateString() fromDate?: string;
  @IsOptional() @IsDateString() toDate?: string;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @IsInt() @Min(1) limit?: number;
}
