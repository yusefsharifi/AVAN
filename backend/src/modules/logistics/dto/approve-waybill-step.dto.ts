import { IsUUID, IsInt, IsEnum, IsOptional, IsString, Min, Max } from 'class-validator';
import { ApprovalStatus } from '@prisma/client';

export class ApproveWaybillStepDto {
  @IsUUID()
  waybillId: string;

  @IsInt()
  @Min(1)
  @Max(10)
  stepOrder: number;

  @IsEnum(ApprovalStatus)
  status: ApprovalStatus;

  @IsOptional()
  @IsString()
  comment?: string;
}
