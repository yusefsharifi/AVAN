import { IsString, IsOptional } from 'class-validator';

export class LoginDto {
  @IsString()
  identifier!: string; // email OR phone

  @IsString()
  password!: string;

  @IsOptional()
  @IsString()
  otpCode?: string;

  @IsOptional()
  @IsString()
  deviceInfo?: string;
}
