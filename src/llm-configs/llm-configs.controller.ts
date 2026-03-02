// src/llm-configs/llm-configs.controller.ts

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
import { LlmConfigsService } from './llm-configs.service';
import { CreateLlmConfigDto } from './dto/create-llm-config.dto';
import { UpdateLlmConfigDto } from './dto/update-llm-config.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import type { LlmConfigResponse } from './llm-configs.types';

@Controller('llm-configs')
export class LlmConfigsController {
  constructor(private llmConfigsService: LlmConfigsService) {}

  @Get()
  async findAll(
    @CurrentUser() user: JwtPayload,
  ): Promise<{ success: boolean; data: LlmConfigResponse[] }> {
    const data = await this.llmConfigsService.findAll(user.sub);
    return { success: true, data };
  }

  @Post()
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateLlmConfigDto,
  ): Promise<{ success: boolean; data: LlmConfigResponse }> {
    const data = await this.llmConfigsService.create(user.sub, dto);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: LlmConfigResponse }> {
    const data = await this.llmConfigsService.findOne(user.sub, id);
    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateLlmConfigDto,
  ): Promise<{ success: boolean; data: LlmConfigResponse }> {
    const data = await this.llmConfigsService.update(user.sub, id, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: null; message: string }> {
    await this.llmConfigsService.remove(user.sub, id);
    return { success: true, data: null, message: 'LLM config deleted' };
  }
}
