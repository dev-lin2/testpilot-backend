// src/test-cases/test-cases.types.ts

import type { TestResultStatus, TestRunStatus } from '@prisma/client';
import type { TestStep } from '../common/types/step.type';

export interface TestCaseResponse {
  id: string;
  suiteId: string;
  name: string;
  description: string | null;
  tags: string[];
  order: number;
  steps: TestStep[];
  llmConfigId: string | null;
  captureScreenshots: boolean;
  captureVideo: boolean;
  variables: Record<string, string>;
  lastResultStatus: TestResultStatus | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RunQueuedResponse {
  runId: string;
  status: TestRunStatus;
}

export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
}

export interface GenerateResult {
  name: string;
  steps: TestStep[];
  tokensUsed: TokenUsage;
}

export interface CoverageSuggestion {
  name: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export interface SuggestCoverageResult {
  suggestions: CoverageSuggestion[];
  tokensUsed: TokenUsage;
}

export interface SelectorValidationItem {
  stepId: string;
  selector: string;
  found: boolean;
  suggestion?: string;
}

export interface ValidateSelectorsResult {
  valid: boolean;
  results: SelectorValidationItem[];
}
