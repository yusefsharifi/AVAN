import { IsString, IsOptional, IsMobilePhone, MinLength } from 'class-validator';

export class AddGroupMemberDto {
  @IsString()
  @MinLength(3)
  visitorName: string;

  @IsOptional()
  @IsString()
  visitorNationalId?: string;

  @IsString()
  visitorPhone: string;

  @IsOptional()
  @IsString()
  visitorCompany?: string;

  @IsOptional()
  @IsString()
  visitorJobTitle?: string;
}
