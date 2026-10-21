import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsArray, IsString, IsEnum } from 'class-validator';
import { RegisterCompanyDto } from './register-company.dto';
import { RiskLevel } from '@prisma/client';

export class UpdateCompanyDto extends PartialType(RegisterCompanyDto) {
  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(RiskLevel)
  riskLevel?: RiskLevel;

  @IsOptional()
  creditLimit?: bigint;
}
