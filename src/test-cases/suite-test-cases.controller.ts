// src/test-cases/suite-test-cases.controller.ts
// Handles: GET /test-suites/:suiteId/test-cases

import { Controller, Get, Param, Query } from '@nestjs/common';
import { TestCasesService } from './test-cases.service';
import { ListCasesQueryDto } from './dto/list-cases-query.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import type { TestCaseResponse } from './test-cases.types';

@Controller('test-suites')
export class SuiteTestCasesController {
  constructor(private testCasesService: TestCasesService) {}

  @Get(':suiteId/test-cases')
  async listBySuite(
    @CurrentUser() user: JwtPayload,
    @Param('suiteId') suiteId: string,
    @Query() query: ListCasesQueryDto,
  ): Promise<{ success: boolean; data: TestCaseResponse[] }> {
    const data = await this.testCasesService.listBySuite(user.sub, suiteId, query);
    return { success: true, data };
  }
}
