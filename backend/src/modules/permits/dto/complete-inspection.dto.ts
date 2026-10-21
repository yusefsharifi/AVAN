import { IsEnum, IsString, IsOptional, IsArray, IsDateString, MinLength } from 'class-validator';
import { InspectionResult } from './create-permit-request.dto';

export class CompleteInspectionDto {
  @IsEnum(InspectionResult)
  result: InspectionResult;

  @IsString()
  @MinLength(10)
  findings: string;

  @IsOptional()
  @IsString()
  recommendations?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageKeys?: string[];

  @IsOptional()
  @IsDateString()
  nextInspectionAt?: string;
}
