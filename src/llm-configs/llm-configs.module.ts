// src/llm-configs/llm-configs.module.ts

import { Module } from '@nestjs/common';
import { LlmConfigsService } from './llm-configs.service';
import { LlmConfigsController } from './llm-configs.controller';

@Module({
  providers: [LlmConfigsService],
  controllers: [LlmConfigsController],
  exports: [LlmConfigsService],
})
export class LlmConfigsModule {}
