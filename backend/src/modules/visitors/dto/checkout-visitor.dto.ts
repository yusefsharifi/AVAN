import { IsUUID, IsOptional, IsString } from 'class-validator';

export class CheckoutVisitorDto {
  @IsUUID()
  visitorRequestId: string;

  @IsUUID()
  gateId: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
