import { IsUUID, IsOptional, IsString } from 'class-validator';

export class AllocatePlotDto {
  @IsUUID()
  companyId!: string;

  @IsUUID()
  plotId!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
