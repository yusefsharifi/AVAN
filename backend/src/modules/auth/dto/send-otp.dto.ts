import { IsString, IsEnum } from 'class-validator';
import { OtpPurpose } from '@prisma/client';

export class SendOtpDto {
  @IsString()
  phone!: string;

  @IsEnum(OtpPurpose)
  purpose!: OtpPurpose;
}
