import { IsString, IsUUID, IsOptional } from 'class-validator';

export class CheckinVisitorDto {
  @IsString()
  qrPayload: string;

  @IsUUID()
  gateId: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
