import {
  IsEmail,
  IsString,
  IsOptional,
  IsUUID,
  MinLength,
  Matches,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  phone!: string;

  @MinLength(8)
  @Matches(/^(?=.*[A-Z])(?=.*[0-9])/, {
    message: 'Password must contain at least one uppercase letter and one number',
  })
  password!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsOptional()
  @IsString()
  nationalId?: string;

  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @IsOptional()
  @IsUUID()
  companyId?: string;

  // Role is NO LONGER accepted from public registration.
  // All self-registrations default to COMPANY_STAFF.
  // Privileged roles must be assigned via admin endpoints only.
}
