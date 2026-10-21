import { IsString, IsOptional, IsEmail, IsNumber, Min, Max } from 'class-validator';

export class CreateCarrierDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  nationalId?: string;

  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;
}
