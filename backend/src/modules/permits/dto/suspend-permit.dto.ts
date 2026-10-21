import { IsString, IsOptional, IsDateString, IsBoolean, MinLength } from 'class-validator';

export class SuspendPermitDto {
  @IsString()
  @MinLength(10)
  reason: string;

  @IsOptional()
  @IsDateString()
  suspendUntil?: string;

  @IsOptional()
  @IsBoolean()
  notifyCompany?: boolean;
}
