import { IsEnum, IsString, IsOptional, IsDateString } from 'class-validator';
import { DocumentType } from '@prisma/client';

export class UploadCompanyDocumentDto {
  @IsEnum(DocumentType)
  type!: DocumentType;

  @IsString()
  title!: string;

  @IsOptional()
  @IsDateString()
  issuedAt?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateContactDto {
  @IsString()
  name!: string;

  @IsString()
  role!: string;

  @IsString()
  phone!: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  isPrimary?: boolean;
}

export class UpdateContactDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  isPrimary?: boolean;
}
