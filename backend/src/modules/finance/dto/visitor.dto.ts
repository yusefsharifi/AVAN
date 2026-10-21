import { IsString, IsOptional, IsNumber, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Finance sales-agent visitors (Step 7 / TASK A).
 *
 * NOT the guard-portal `VisitorRequest` — see the note on the `FinanceVisitor`
 * model in schema.prisma. The wire contract is the frontend's `Visitor`:
 * id, code, name, phone, region, commissionRate, status, notes.
 */
export enum FinanceVisitorStatusDto {
  active = 'active',
  inactive = 'inactive',
}

/** POST /finance/visitors */
export class CreateFinanceVisitorDto {
  /**
   * Target zone, resolved by the shared `@ResolveZoneId()`:
   * body.zoneId -> query.zoneId -> session zone. Zone/company users never send
   * it; SUPER_ADMIN must (Step-4 TASK 3).
   */
  @ApiPropertyOptional({ description: 'Zone id; SUPER_ADMIN must supply it, others inherit' })
  @IsOptional()
  @IsString()
  zoneId?: string;

  @ApiProperty({ example: 'VIS-1404-001' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'آقای رضایی' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: '09121234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'تهران' })
  @IsOptional()
  @IsString()
  region?: string;

  /** Commission as a percentage — a rate, not an amount, hence Float not BigInt. */
  @ApiPropertyOptional({ example: 2.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  commissionRate?: number;

  @ApiPropertyOptional({ enum: FinanceVisitorStatusDto })
  @IsOptional()
  @IsEnum(FinanceVisitorStatusDto)
  status?: FinanceVisitorStatusDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  // ── Client envelope; accepted, ignored (the server issues its own) ─────────
  @ApiPropertyOptional({ description: 'Client id; ignored' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  createdAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  updatedAt?: string;
}

/** PATCH /finance/visitors/:id */
export class UpdateFinanceVisitorDto {
  @ApiPropertyOptional({ description: 'Zone id; SUPER_ADMIN must supply it, others inherit' })
  @IsOptional()
  @IsString()
  zoneId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  commissionRate?: number;

  @ApiPropertyOptional({ enum: FinanceVisitorStatusDto })
  @IsOptional()
  @IsEnum(FinanceVisitorStatusDto)
  status?: FinanceVisitorStatusDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Client id; ignored' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  createdAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  updatedAt?: string;
}
