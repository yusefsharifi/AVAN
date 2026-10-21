import { IsOptional, IsString } from 'class-validator';

export class RefreshTokenDto {
  /**
   * Optional: when the refresh token is delivered via the HttpOnly
   * `idop_refresh` cookie (BUG-PERSIST-001), the body may be omitted/empty.
   * Body-based refresh is still accepted for non-browser clients.
   */
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
