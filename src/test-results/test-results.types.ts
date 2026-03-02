// src/test-results/test-results.types.ts

import type { StepLog } from '../common/types/step.type';

export interface AutoHealSuggestion {
  stepIndex: number;
  newSelector: string;
}

export interface AiAnalysis {
  summary: string;
  suggestion: string;
  autoHealSuggestion: AutoHealSuggestion | null;
}

export interface AiAnalysisWithTokens extends AiAnalysis {
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export interface TestResultDetail {
  id: string;
  runId: string;
  testCaseId: string;
  testCaseName: string;
  status: string;
  reason: string | null;
  errorDetail: string | null;
  failedStepIndex: number | null;
  failedStepAction: string | null;
  screenshots: string[];
  videoUrl: string | null;
  logs: StepLog[];
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  duration: number;
  aiAnalysis: AiAnalysis | null;
}
