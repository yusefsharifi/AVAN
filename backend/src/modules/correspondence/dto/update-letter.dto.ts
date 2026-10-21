// ═══════════════════════════════════════════════════════════════════════════════
// M7: Correspondence — Update Letter DTO (PATCH /letters/:id)
// همه فیلدها اختیاری‌اند؛ فقط فیلدهای ارسالی از سمت UI به‌روزرسانی می‌شوند.
// ═══════════════════════════════════════════════════════════════════════════════

import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  LetterClassification,
  LetterPriority,
  RecipientDto,
} from './create-letter.dto';

export class UpdateLetterDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  subject?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  body?: string;

  @IsOptional()
  @IsString()
  salutation?: string;

  @IsOptional()
  @IsString()
  closing?: string;

  @IsOptional()
  @IsEnum(LetterClassification)
  classification?: LetterClassification;

  @IsOptional()
  @IsEnum(LetterPriority)
  priority?: LetterPriority;

  @IsOptional()
  @IsString()
  topic?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  enclosuresCount?: number;

  @IsOptional()
  @IsString()
  signatory?: string;

  @IsOptional()
  @IsString()
  signatoryRole?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  slaHours?: number;

  @IsOptional()
  @IsBoolean()
  starred?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  internalNotes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipientDto)
  recipients?: RecipientDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cc?: string[];
}
