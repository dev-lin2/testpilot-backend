// src/scheduler/scheduler.module.ts

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { SchedulerController } from './scheduler.controller';
import { SchedulerService } from './scheduler.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'test-runs' })],
  controllers: [SchedulerController],
  providers: [SchedulerService],
})
export class SchedulerModule {}
