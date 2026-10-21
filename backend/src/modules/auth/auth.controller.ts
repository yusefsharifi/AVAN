import { RequirePermission } from '../../common/decorators/permissions.decorator';
import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { UserService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from '../users/dto/update-user.dto';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/guards/jwt.guard';
import { Request } from 'express';
import { successResponse } from '../../common/dto/response.dto';
import {
  setAuthCookies,
  clearAuthCookies,
  readRefreshCookie,
} from './auth-cookies';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  async register(@Body() dto: RegisterDto) {
    const result = await this.authService.register(dto);
    return successResponse(result);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with credentials' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = req.ip || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';
    const result = await this.authService.login(dto, ip, userAgent);
    // BUG-PERSIST-001: hand the refresh token to the browser as an HttpOnly
    // cookie so the session survives a full page refresh. Only issued once the
    // OTP step (if any) has been completed.
    if (result?.refreshToken && !result.requiresOtp) {
      const csrfToken = setAuthCookies(req, res, result.refreshToken);
      return successResponse({ ...result, csrfToken });
    }
    return successResponse(result);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refreshToken(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // BUG-PERSIST-001: accept the refresh token from the HttpOnly cookie when
    // the body does not carry one (browser SPA flow after a page refresh).
    const refreshToken = dto?.refreshToken || readRefreshCookie(req);
    if (!refreshToken) {
      throw new UnauthorizedException({
        success: false,
        code: 'AUTH_REFRESH_REQUIRED',
        message: 'نشست منقضی شده است. لطفاً دوباره وارد شوید.',
      });
    }
    const result = await this.authService.refreshToken({ refreshToken });
    const csrfToken = setAuthCookies(req, res, result.refreshToken);
    return successResponse({ ...result, csrfToken });
  }

  @Post('logout')
  @UseGuards(JwtGuard, PermissionsGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout current session' })
  async logout(
    @CurrentUser('sub') userId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const payload = (req as any).user as JwtPayload;
    // SECURITY FIX (SEC-004/BUG-001): Pass both userId and jti so the
    // service can blacklist the access token and revoke sessions.
    await this.authService.logout(userId, payload.jti);
    clearAuthCookies(res);
    return successResponse({ message: 'خروج با موفقیت انجام شد' });
  }

  @Post('logout-all')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout all devices' })
  async logoutAll(
    @CurrentUser('sub') userId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const payload = (req as any).user as JwtPayload;
    await this.authService.logoutAll(userId, payload.jti);
    clearAuthCookies(res);
    return successResponse({ message: 'خروج از همه دستگاه‌ها با موفقیت انجام شد' });
  }

  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP code to phone' })
  async sendOtp(@Body() dto: SendOtpDto) {
    await this.authService.sendOtp(dto);
    return successResponse({ message: 'کد تأیید ارسال شد' });
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP code' })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    const result = await this.authService.verifyOtp(dto);
    return successResponse({ verified: result });
  }

  @Post('verify-phone')
  @RequirePermission('auth.profile.profile.create')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify phone number' })
  async verifyPhone(
    @CurrentUser('sub') userId: string,
    @Body('otpCode') otpCode: string,
  ) {
    await this.authService.verifyPhone(userId, otpCode);
    return successResponse({ message: 'شماره تلفن تأیید شد' });
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  async forgotPassword(@Body('email') email: string) {
    await this.authService.sendPasswordReset(email);
    return successResponse({ message: 'اگر ایمیل شما در سیستم ثبت شده باشد، لینک بازیابی ارسال خواهد شد' });
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto);
    return successResponse({ message: 'رمز عبور با موفقیت تغییر کرد' });
  }

  // ── Profile ─────────────────────────────────────────────────────────────

  @Get('me')
  @RequirePermission('auth.profile.profile.view')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser('sub') userId: string) {
    const profile = await this.userService.getProfile(userId);
    return successResponse(profile);
  }

  @Patch('me')
  @RequirePermission('auth.profile.profile.update')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  async updateProfile(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    const profile = await this.userService.updateProfile(userId, dto);
    return successResponse(profile);
  }

  @Patch('me/password')
  @RequirePermission('auth.profile.profile.update')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password' })
  async changePassword(
    @CurrentUser('sub') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.userService.changePassword(userId, dto);
    return successResponse({ message: 'رمز عبور تغییر کرد. لطفاً دوباره وارد شوید.' });
  }

  // ── 2FA ─────────────────────────────────────────────────────────────────

  @Post('me/2fa/enable')
  @RequirePermission('auth.2fa.2fa.create')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enable 2FA - generate QR code' })
  async enable2FA(@CurrentUser('sub') userId: string) {
    const result = await this.userService.enable2FA(userId);
    return successResponse(result);
  }

  @Post('me/2fa/confirm')
  @RequirePermission('auth.2fa.2fa.create')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm 2FA with OTP code' })
  async confirm2FA(
    @CurrentUser('sub') userId: string,
    @Body('otpCode') otpCode: string,
  ) {
    await this.userService.confirm2FA(userId, otpCode);
    return successResponse({ message: 'احراز هویت دو مرحله‌ای فعال شد' });
  }

  @Delete('me/2fa')
  @RequirePermission('auth.2fa.2fa.delete')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable 2FA' })
  async disable2FA(
    @CurrentUser('sub') userId: string,
    @Body('password') password: string,
  ) {
    await this.userService.disable2FA(userId, password);
    return successResponse({ message: 'احراز هویت دو مرحله‌ای غیرفعال شد' });
  }

  // ── Sessions ────────────────────────────────────────────────────────────

  @Get('me/sessions')
  @RequirePermission('auth.sessions.sessions.view')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get active sessions' })
  async getActiveSessions(@CurrentUser('sub') userId: string) {
    const sessions = await this.userService.getActiveSessions(userId);
    return successResponse(sessions);
  }

  @Delete('me/sessions/:id')
  @RequirePermission('auth.sessions.sessions.delete')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a session' })
  async revokeSession(
    @CurrentUser('sub') userId: string,
    @Req() req: Request,
  ) {
    const sessionId = req.params.id as string;
    await this.userService.revokeSession(sessionId, userId);
    return successResponse({ message: 'نشست لغو شد' });
  }
}
