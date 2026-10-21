import { IsOptional, IsString, IsBoolean, IsEnum, IsUUID, IsArray } from 'class-validator';
import { RoleScope } from '@prisma/client';

export class CreateRoleDto {
  @IsString()
  name!: string;

  @IsString()
  nameFa!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(RoleScope)
  scopeType?: RoleScope;

  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @IsOptional()
  @IsUUID()
  companyId?: string;
}

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  nameFa?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class SetRolePermissionsDto {
  @IsArray()
  @IsString({ each: true })
  permissions!: string[];
}

export class AssignRoleDto {
  @IsUUID()
  userId!: string;
}
