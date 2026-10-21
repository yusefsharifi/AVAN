import { IsInt, IsEnum, IsOptional, IsString, IsArray, IsDateString } from 'class-validator';
import { ApprovalStatus } from './create-permit-request.dto';

export class ReviewPermitStepDto {
  @IsInt()
  stepOrder: number;

  @IsEnum(ApprovalStatus)
  status: ApprovalStatus;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  conditions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];

  @IsOptional()
  @IsDateString()
  scheduleSiteVisitAt?: string;
}
