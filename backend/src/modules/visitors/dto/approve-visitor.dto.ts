import { IsBoolean, IsOptional, IsString, IsArray, IsInt, Min, Max } from 'class-validator';

export class ApproveVisitorDto {
  @IsBoolean()
  approved: boolean;

  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedGates?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedZones?: string[];

  @IsOptional()
  @IsBoolean()
  requiresEscort?: boolean;

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(480)
  maxDuration?: number;
}
