// src/environments/environments.controller.ts

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
import { EnvironmentsService } from './environments.service';
import { CreateEnvironmentDto } from './dto/create-environment.dto';
import { UpdateEnvironmentDto } from './dto/update-environment.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import type { EnvironmentResponse } from './environments.types';

@Controller('environments')
export class EnvironmentsController {
  constructor(private environmentsService: EnvironmentsService) {}

  @Get()
  async findAll(
    @CurrentUser() user: JwtPayload,
  ): Promise<{ success: boolean; data: EnvironmentResponse[] }> {
    const data = await this.environmentsService.findAll(user.sub);
    return { success: true, data };
  }

  @Post()
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateEnvironmentDto,
  ): Promise<{ success: boolean; data: EnvironmentResponse }> {
    const data = await this.environmentsService.create(user.sub, dto);
    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateEnvironmentDto,
  ): Promise<{ success: boolean; data: EnvironmentResponse }> {
    const data = await this.environmentsService.update(user.sub, id, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: null; message: string }> {
    await this.environmentsService.remove(user.sub, id);
    return { success: true, data: null, message: 'Environment deleted' };
  }
}
