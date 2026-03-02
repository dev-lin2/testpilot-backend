// src/test-suites/test-suites.module.ts

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TestSuitesService, TEST_RUNS_QUEUE } from './test-suites.service';
import { TestSuitesController } from './test-suites.controller';

@Module({
  imports: [BullModule.registerQueue({ name: TEST_RUNS_QUEUE })],
  providers: [TestSuitesService],
  controllers: [TestSuitesController],
  exports: [TestSuitesService],
})
export class TestSuitesModule {}
