import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsEmail,
  IsInt,
} from 'class-validator';
import { CompanyType } from '@prisma/client';

export class RegisterCompanyDto {
  @IsUUID()
  zoneId!: string;

  @IsString()
  registrationNumber!: string;

  @IsString()
  nationalId!: string;

  @IsString()
  nameFa!: string;

  @IsOptional()
  @IsString()
  nameEn?: string;

  @IsEnum(CompanyType)
  type!: CompanyType;

  @IsString()
  industryCategory!: string;

  @IsOptional()
  @IsString()
  economicCode?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsString()
  ceoName!: string;

  @IsString()
  ceoNationalId!: string;

  @IsString()
  ceoPhone!: string;

  @IsOptional()
  @IsEmail()
  ceoEmail?: string;

  @IsOptional()
  @IsInt()
  employeeCount?: number;

  @IsOptional()
  @IsString()
  mainProduct?: string;
}
