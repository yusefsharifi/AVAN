import { IsUUID, IsInt, IsString, MinLength, Min, Max } from 'class-validator';

export class RequestExtensionDto {
  @IsUUID()
  visitorRequestId: string;

  @IsInt()
  @Min(15)
  @Max(480)
  additionalMinutes: number;

  @IsString()
  @MinLength(5)
  reason: string;
}
