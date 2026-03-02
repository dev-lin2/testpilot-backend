// src/ai/ai.module.ts

import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { LlmConfigsModule } from '../llm-configs/llm-configs.module';

@Module({
  imports: [LlmConfigsModule],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
