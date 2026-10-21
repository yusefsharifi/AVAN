import { IsEnum, IsOptional, IsString, IsArray } from 'class-validator';
import { OnboardingStepName, StepStatus } from '@prisma/client';

export class ReviewOnboardingStepDto {
  @IsEnum(OnboardingStepName)
  stepName!: OnboardingStepName;

  @IsEnum(StepStatus)
  status!: StepStatus;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsArray()
  attachments?: string[];
}
