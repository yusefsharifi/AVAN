import { IsString, IsOptional, IsUUID, IsEnum, IsBoolean, IsInt, IsNumber, Min, IsArray, ValidateNested, IsDateString, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { CertificateType, CertStorageType, SignableDocumentType, SignatureType, SigningMode } from './enums';

export class RegisterCertificateDto {
  @IsUUID() userId: string;
  @IsOptional() @IsUUID() zoneId?: string;
  @IsEnum(CertificateType) type: CertificateType;
  @IsEnum(CertStorageType) storageType: CertStorageType;
  @IsString() commonName: string;
  @IsOptional() @IsString() organizationName?: string;
  @IsOptional() @IsString() tokenSerial?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() certificatePem?: string;
  @IsOptional() @IsString() certFileKey?: string;
}

export class UploadSoftwareCertDto {
  @IsUUID() userId: string;
  @IsString() password: string;
}

export class SignerDto {
  @IsUUID() signerId: string;
  @IsString() signerRole: string;
  @IsInt() @Min(1) order: number;
  @IsBoolean() isRequired: boolean;
}

export class RequestSignatureDto {
  @IsUUID() zoneId: string;
  @IsEnum(SignableDocumentType) documentType: SignableDocumentType;
  @IsUUID() documentId: string;
  @IsString() documentTitle: string;
  @IsEnum(SigningMode) signingMode: SigningMode;
  @IsArray() @ValidateNested({ each: true }) @Type(() => SignerDto) signers: SignerDto[];
  @IsOptional() @IsDateString() deadline?: string;
  @IsOptional() @IsString() notes?: string;
}

export class SignDocumentDto {
  @IsUUID() signatureRequestId: string;
  @IsUUID() certificateId: string;
  @IsOptional() @IsString() pfxPassword?: string;
  @IsOptional() @IsString() otpCode?: string;
  @IsEnum(SignatureType) signatureType: SignatureType;
  @IsOptional() @IsInt() signaturePage?: number;
  @IsOptional() @IsNumber() signatureX?: number;
  @IsOptional() @IsNumber() signatureY?: number;
  @IsOptional() @IsString() pinCode?: string;
  @IsOptional() @IsString() notes?: string;
}

export class BulkSignDto {
  @IsArray() requestIds: string[];
  @IsUUID() certificateId: string;
  @IsEnum(SignatureType) signatureType: SignatureType;
  @IsOptional() @IsString() pfxPassword?: string;
  @IsOptional() @IsString() otpCode?: string;
}

export class VerifySignatureDto {
  @IsOptional() @IsUUID() signatureId?: string;
  @IsOptional() @IsString() verificationQrHash?: string;
  @IsOptional() @IsString() documentHash?: string;
}

export class VerifyDocumentDto {
  @IsEnum(SignableDocumentType) documentType: SignableDocumentType;
  @IsUUID() documentId: string;
}

export class DeclineSignatureDto {
  @IsUUID() signatureRequestId: string;
  @IsString() @MinLength(5) reason: string;
}

export class DelegateSigningDto {
  @IsUUID() signatureRequestId: string;
  @IsUUID() delegateToUserId: string;
  @IsString() @MinLength(5) reason: string;
  @IsOptional() @IsDateString() delegateUntil?: string;
}

export class TemplateSignerDto {
  @IsString() role: string;
  @IsInt() @Min(1) order: number;
  @IsBoolean() isRequired: boolean;
}

export class CreateSignatureTemplateDto {
  @IsOptional() @IsUUID() zoneId?: string;
  @IsEnum(SignableDocumentType) documentType: SignableDocumentType;
  @IsString() nameFa: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => TemplateSignerDto) signers: TemplateSignerDto[];
  @IsEnum(SigningMode) signingMode: SigningMode;
  @IsOptional() @IsInt() deadlineDays?: number;
}

export class FilterSignatureRequestsDto {
  @IsOptional() @IsUUID() zoneId?: string;
  @IsOptional() @IsEnum(SignableDocumentType) documentType?: SignableDocumentType;
  @IsOptional() @IsEnum(SignableDocumentType) status?: SignableDocumentType;
  @IsOptional() @IsUUID() signerId?: string;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @IsInt() limit?: number;
}
