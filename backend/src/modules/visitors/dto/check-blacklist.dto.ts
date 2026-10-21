import { IsString, IsOptional } from 'class-validator';

export class CheckBlacklistDto {
  @IsOptional()
  @IsString()
  nationalId?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  name?: string;
}
