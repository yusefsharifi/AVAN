import { IsString, IsOptional, IsUUID, Matches } from 'class-validator';

export class RescheduleAppointmentDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  newDate: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  newTime: string;

  @IsOptional()
  @IsUUID()
  newGateId?: string;

  @IsOptional()
  @IsUUID()
  newDockId?: string;

  @IsString()
  reason: string;
}
