import { IsString, IsEnum, Length } from 'class-validator';
import { OtpPurpose } from '@prisma/client';

export class VerifyOtpDto {
  @IsString()
  phone!: string;

  @IsString()
  @Length(6, 6)
  code!: string;

  @IsEnum(OtpPurpose)
  purpose!: OtpPurpose;
}
