// src/notifications/notifications.controller.ts

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationConfigDto } from './dto/create-notification-config.dto';
import { UpdateNotificationConfigDto } from './dto/update-notification-config.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import type { NotificationConfigResponse } from './notifications.types';

@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get('configs')
  async findAll(
    @CurrentUser() user: JwtPayload,
  ): Promise<{ success: boolean; data: NotificationConfigResponse[] }> {
    const data = await this.notificationsService.findAll(user.sub);
    return { success: true, data };
  }

  @Post('configs')
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateNotificationConfigDto,
  ): Promise<{ success: boolean; data: NotificationConfigResponse }> {
    const data = await this.notificationsService.create(user.sub, dto);
    return { success: true, data };
  }

  @Patch('configs/:id')
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateNotificationConfigDto,
  ): Promise<{ success: boolean; data: NotificationConfigResponse }> {
    const data = await this.notificationsService.update(user.sub, id, dto);
    return { success: true, data };
  }

  @Delete('configs/:id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: null; message: string }> {
    await this.notificationsService.remove(user.sub, id);
    return {
      success: true,
      data: null,
      message: 'Notification config deleted',
    };
  }
}
