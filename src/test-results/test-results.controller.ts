// src/test-results/test-results.controller.ts

import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { TestResultsService } from './test-results.service';
import { AnalyzeResultDto } from './dto/analyze-result.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import type {
  TestResultDetail,
  AiAnalysisWithTokens,
} from './test-results.types';

@Controller('test-results')
export class TestResultsController {
  constructor(private testResultsService: TestResultsService) {}

  @Get(':id')
  async findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: TestResultDetail }> {
    const data = await this.testResultsService.findOne(user.sub, id);
    return { success: true, data };
  }

  @Post(':id/analyze')
  async analyze(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AnalyzeResultDto,
  ): Promise<{ success: boolean; data: AiAnalysisWithTokens }> {
    const data = await this.testResultsService.analyze(user.sub, id, dto);
    return { success: true, data };
  }
}
