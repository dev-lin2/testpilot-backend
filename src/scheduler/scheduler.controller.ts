// src/scheduler/scheduler.controller.ts

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
import { SchedulerService } from './scheduler.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import type { ScheduleResponse } from './scheduler.types';

@Controller('schedules')
export class SchedulerController {
  constructor(private schedulerService: SchedulerService) {}

  @Get()
  async findAll(
    @CurrentUser() user: JwtPayload,
  ): Promise<{ success: boolean; data: ScheduleResponse[] }> {
    const data = await this.schedulerService.findAll(user.sub);
    return { success: true, data };
  }

  @Post()
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateScheduleDto,
  ): Promise<{ success: boolean; data: ScheduleResponse }> {
    const data = await this.schedulerService.create(user.sub, dto);
    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateScheduleDto,
  ): Promise<{ success: boolean; data: ScheduleResponse }> {
    const data = await this.schedulerService.update(user.sub, id, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: null; message: string }> {
    await this.schedulerService.remove(user.sub, id);
    return { success: true, data: null, message: 'Schedule deleted' };
  }
}
