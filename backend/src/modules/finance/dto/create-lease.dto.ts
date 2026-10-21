import {
  IsString,
  IsUUID,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsDateString,
} from 'class-validator';

export class CreateLeaseContractDto {
  @IsUUID()
  zoneId: string;

  @IsUUID()
  companyId: string;

  @IsOptional()
  @IsUUID()
  plotId?: string;

  @IsOptional()
  @IsString()
  block?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  areaSqM?: number;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;

  @IsOptional()
  @IsInt()
  renewalNoticeDays?: number;

  @IsInt()
  @Min(0)
  monthlyRent: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  securityDeposit?: number;

  @IsOptional()
  rentEscalation?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  billingDay?: number;

  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
