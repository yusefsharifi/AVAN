import { UserRole, UserStatus } from '@prisma/client';

export class UserResponseDto {
  id!: string;
  email!: string;
  phone!: string;
  firstName!: string;
  lastName!: string;
  role!: UserRole;
  status!: UserStatus;
  zoneId?: string | null;
  companyId?: string | null;
  avatarKey?: string | null;
  createdAt!: Date;

  static fromUser(user: {
    id: string;
    email: string;
    phone: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    status: UserStatus;
    zoneId: string | null;
    companyId: string | null;
    avatarKey: string | null;
    createdAt: Date;
  }): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.phone = user.phone;
    dto.firstName = user.firstName;
    dto.lastName = user.lastName;
    dto.role = user.role;
    dto.status = user.status;
    dto.zoneId = user.zoneId;
    dto.companyId = user.companyId;
    dto.avatarKey = user.avatarKey;
    dto.createdAt = user.createdAt;
    return dto;
  }
}

export class UserProfileDto extends UserResponseDto {
  nationalId?: string | null;
  lastLoginAt?: Date | null;
  twoFactorEnabled!: boolean;
  mustChangePassword!: boolean;

  static fromUserProfile(user: {
    id: string;
    email: string;
    phone: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    status: UserStatus;
    zoneId: string | null;
    companyId: string | null;
    avatarKey: string | null;
    createdAt: Date;
    nationalId: string | null;
    lastLoginAt: Date | null;
    twoFactorEnabled: boolean;
    mustChangePassword: boolean;
  }): UserProfileDto {
    const dto = new UserProfileDto();
    Object.assign(dto, UserResponseDto.fromUser(user));
    dto.nationalId = user.nationalId;
    dto.lastLoginAt = user.lastLoginAt;
    dto.twoFactorEnabled = user.twoFactorEnabled;
    dto.mustChangePassword = user.mustChangePassword;
    return dto;
  }
}
