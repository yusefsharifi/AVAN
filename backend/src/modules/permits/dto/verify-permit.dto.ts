import { IsString } from 'class-validator';

export class VerifyPermitDto {
  @IsString()
  qrHash: string;
}
