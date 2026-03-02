// src/test-runs/test-runs.module.ts

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { JwtModule } from '@nestjs/jwt';
import { TestRunsController } from './test-runs.controller';
import { TestRunsService } from './test-runs.service';
import { TestRunsProcessor } from './test-runs.processor';
import { PlaywrightModule } from '../playwright/playwright.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'test-runs' }),
    JwtModule,
    PlaywrightModule,
  ],
  controllers: [TestRunsController],
  providers: [TestRunsService, TestRunsProcessor],
  exports: [TestRunsService],
})
export class TestRunsModule {}
