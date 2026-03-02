// src/test-cases/test-cases.module.ts

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TestCasesService, TEST_RUNS_QUEUE } from './test-cases.service';
import { TestCasesController } from './test-cases.controller';
import { SuiteTestCasesController } from './suite-test-cases.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [BullModule.registerQueue({ name: TEST_RUNS_QUEUE }), AiModule],
  providers: [TestCasesService],
  controllers: [TestCasesController, SuiteTestCasesController],
  exports: [TestCasesService],
})
export class TestCasesModule {}
