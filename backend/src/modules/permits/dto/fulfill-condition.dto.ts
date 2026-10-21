import { IsUUID, IsString, IsOptional, MinLength } from 'class-validator';

export class FulfillConditionDto {
  @IsUUID()
  conditionId: string;

  @IsString()
  @MinLength(5)
  notes: string;

  @IsOptional()
  @IsString()
  evidenceKey?: string;
}
