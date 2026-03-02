// src/test-cases/test-cases.controller.ts

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
import { TestCasesService } from './test-cases.service';
import { CreateTestCaseDto } from './dto/create-test-case.dto';
import { UpdateTestCaseDto } from './dto/update-test-case.dto';
import { ReorderCasesDto } from './dto/reorder-cases.dto';
import { GenerateTestCaseDto } from './dto/generate-test-case.dto';
import { SuggestCoverageDto } from './dto/suggest-coverage.dto';
import { ValidateSelectorsDto } from './dto/validate-selectors.dto';
import { RunCaseDto } from './dto/run-case.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import type {
  TestCaseResponse,
  RunQueuedResponse,
  GenerateResult,
  SuggestCoverageResult,
  ValidateSelectorsResult,
} from './test-cases.types';

@Controller('test-cases')
export class TestCasesController {
  constructor(private testCasesService: TestCasesService) {}

  // Static routes BEFORE parameterised routes

  @Post('generate')
  async generate(
    @CurrentUser() user: JwtPayload,
    @Body() dto: GenerateTestCaseDto,
  ): Promise<{ success: boolean; data: GenerateResult }> {
    const data = await this.testCasesService.generate(user.sub, dto);
    return { success: true, data };
  }

  @Post('suggest-coverage')
  async suggestCoverage(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SuggestCoverageDto,
  ): Promise<{ success: boolean; data: SuggestCoverageResult }> {
    const data = await this.testCasesService.suggestCoverage(user.sub, dto);
    return { success: true, data };
  }

  @Patch('reorder')
  @HttpCode(HttpStatus.OK)
  async reorder(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ReorderCasesDto,
  ): Promise<{ success: boolean; data: null; message: string }> {
    await this.testCasesService.reorder(user.sub, dto);
    return { success: true, data: null, message: 'Order updated' };
  }

  @Post()
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTestCaseDto,
  ): Promise<{ success: boolean; data: TestCaseResponse }> {
    const data = await this.testCasesService.create(user.sub, dto);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: TestCaseResponse }> {
    const data = await this.testCasesService.findOne(user.sub, id);
    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateTestCaseDto,
  ): Promise<{ success: boolean; data: TestCaseResponse }> {
    const data = await this.testCasesService.update(user.sub, id, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: null; message: string }> {
    await this.testCasesService.remove(user.sub, id);
    return { success: true, data: null, message: 'Test case archived' };
  }

  @Post(':id/run')
  @HttpCode(HttpStatus.ACCEPTED)
  async run(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: RunCaseDto,
  ): Promise<{ success: boolean; data: RunQueuedResponse; message: string }> {
    const data = await this.testCasesService.run(user.sub, id, dto);
    return { success: true, data, message: 'Test run queued' };
  }

  @Post(':id/duplicate')
  async duplicate(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: TestCaseResponse }> {
    const data = await this.testCasesService.duplicate(user.sub, id);
    return { success: true, data };
  }

  @Post(':id/validate-selectors')
  async validateSelectors(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ValidateSelectorsDto,
  ): Promise<{ success: boolean; data: ValidateSelectorsResult }> {
    const data = await this.testCasesService.validateSelectors(
      user.sub,
      id,
      dto,
    );
    return { success: true, data };
  }
}
