import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ApproveExtensionDto {
  @IsBoolean()
  approved: boolean;

  @IsOptional()
  @IsString()
  comment?: string;
}
