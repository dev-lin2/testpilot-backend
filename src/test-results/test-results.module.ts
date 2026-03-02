// src/test-results/test-results.module.ts

import { Module } from '@nestjs/common';
import { TestResultsController } from './test-results.controller';
import { TestResultsService } from './test-results.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [TestResultsController],
  providers: [TestResultsService],
})
export class TestResultsModule {}
