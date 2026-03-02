// src/users/users.controller.ts

import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import type { UserProfile, ApiKeyMasked, ApiKeyCreated } from './users.types';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('profile')
  async getProfile(
    @CurrentUser() user: JwtPayload,
  ): Promise<{ success: boolean; data: UserProfile }> {
    const data = await this.usersService.getProfile(user.sub);
    return { success: true, data };
  }

  @Patch('profile')
  async updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateProfileDto,
  ): Promise<{ success: boolean; data: UserProfile }> {
    const data = await this.usersService.updateProfile(user.sub, dto);
    return { success: true, data };
  }

  @Patch('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ success: boolean; data: null; message: string }> {
    await this.usersService.changePassword(user.sub, dto);
    return {
      success: true,
      data: null,
      message: 'Password changed successfully',
    };
  }

  @Get('api-keys')
  async getApiKeys(
    @CurrentUser() user: JwtPayload,
  ): Promise<{ success: boolean; data: ApiKeyMasked[] }> {
    const data = await this.usersService.getApiKeys(user.sub);
    return { success: true, data };
  }

  @Post('api-keys')
  async createApiKey(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateApiKeyDto,
  ): Promise<{ success: boolean; data: ApiKeyCreated; message: string }> {
    const data = await this.usersService.createApiKey(user.sub, dto);
    return {
      success: true,
      data,
      message: 'Save this key — it will not be shown again',
    };
  }

  @Delete('api-keys/:id')
  @HttpCode(HttpStatus.OK)
  async deleteApiKey(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: null; message: string }> {
    await this.usersService.deleteApiKey(user.sub, id);
    return { success: true, data: null, message: 'API key deleted' };
  }
}
