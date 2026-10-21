import { RegisterDto } from '../../auth/dto/register.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateUserDto extends RegisterDto {
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
