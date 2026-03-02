// src/ai/ai.types.ts

export interface LlmMessages {
  system: string;
  user: string;
}

export interface LlmCallResult {
  content: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}
