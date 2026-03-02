// src/auth/auth.controller.ts

import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import type { AuthResult, TokenPair, AuthUser } from './auth.types';
import type { User } from '@prisma/client';

interface RequestWithUser extends Request {
  user: Omit<User, 'password'>;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto): Promise<{ success: boolean; data: AuthResult }> {
    const result = await this.authService.register(dto);
    return { success: true, data: result };
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Request() req: RequestWithUser,
  ): Promise<{ success: boolean; data: AuthResult }> {
    const result = await this.authService.login(req.user);
    return { success: true, data: result };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: JwtPayload,
  ): Promise<{ success: boolean; data: null; message: string }> {
    await this.authService.logout(user.sub);
    return { success: true, data: null, message: 'Logged out successfully' };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() dto: RefreshTokenDto,
  ): Promise<{ success: boolean; data: TokenPair }> {
    const result = await this.authService.refresh(dto.refreshToken);
    return { success: true, data: result };
  }

  @Get('me')
  async me(
    @CurrentUser() user: JwtPayload,
  ): Promise<{ success: boolean; data: AuthUser & { createdAt: Date } }> {
    const result = await this.authService.getMe(user.sub);
    return { success: true, data: result };
  }
}
