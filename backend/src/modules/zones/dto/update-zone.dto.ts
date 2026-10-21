import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsEnum } from 'class-validator';
import { CreateZoneDto } from './create-zone.dto';
import { ZoneStatus } from '@prisma/client';

export class UpdateZoneDto extends PartialType(CreateZoneDto) {
  @IsOptional()
  @IsEnum(ZoneStatus)
  status?: ZoneStatus;
}
