// src/llm-configs/llm-configs.types.ts

import type { LLMProvider } from '@prisma/client';

export interface LlmConfigResponse {
  id: string;
  name: string;
  provider: LLMProvider;
  model: string;
  baseUrl: string | null;
  temperature: number;
  maxTokens: number;
  tokenBudget: number | null;
  totalTokens: number;
  createdAt: Date;
  updatedAt: Date;
}
