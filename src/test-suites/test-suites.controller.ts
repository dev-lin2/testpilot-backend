// src/test-suites/test-suites.controller.ts

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TestSuitesService } from './test-suites.service';
import { CreateTestSuiteDto } from './dto/create-test-suite.dto';
import { UpdateTestSuiteDto } from './dto/update-test-suite.dto';
import { RunSuiteDto } from './dto/run-suite.dto';
import { ListSuitesQueryDto } from './dto/list-suites-query.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import type {
  TestSuiteListItem,
  TestSuiteDetail,
  RunQueuedResponse,
  SuiteListResult,
} from './test-suites.types';
import type { PaginationMeta } from '../common/types/response.type';

@Controller('test-suites')
export class TestSuitesController {
  constructor(private testSuitesService: TestSuitesService) {}

  @Get()
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListSuitesQueryDto,
  ): Promise<{
    success: boolean;
    data: TestSuiteListItem[];
    meta: PaginationMeta;
  }> {
    const result: SuiteListResult = await this.testSuitesService.findAll(
      user.sub,
      query,
    );
    return { success: true, ...result };
  }

  @Post()
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTestSuiteDto,
  ): Promise<{ success: boolean; data: TestSuiteListItem }> {
    const data = await this.testSuitesService.create(user.sub, dto);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: TestSuiteDetail }> {
    const data = await this.testSuitesService.findOne(user.sub, id);
    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateTestSuiteDto,
  ): Promise<{ success: boolean; data: TestSuiteListItem }> {
    const data = await this.testSuitesService.update(user.sub, id, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: null; message: string }> {
    await this.testSuitesService.remove(user.sub, id);
    return { success: true, data: null, message: 'Test suite archived' };
  }

  @Post(':id/run')
  @HttpCode(HttpStatus.ACCEPTED)
  async run(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: RunSuiteDto,
  ): Promise<{ success: boolean; data: RunQueuedResponse; message: string }> {
    const data = await this.testSuitesService.run(user.sub, id, dto);
    return { success: true, data, message: 'Test run queued' };
  }

  @Post(':id/duplicate')
  async duplicate(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: TestSuiteListItem }> {
    const data = await this.testSuitesService.duplicate(user.sub, id);
    return { success: true, data };
  }
}
