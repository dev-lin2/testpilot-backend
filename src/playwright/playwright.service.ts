// src/playwright/playwright.service.ts

import { Injectable } from '@nestjs/common';
import type { TestCase, Environment } from '@prisma/client';
import type { StepLog } from '../common/types/step.type';
import type { TestResultStatus } from '@prisma/client';

export interface PlaywrightRunResult {
  status: TestResultStatus;
  reason?: string;
  errorDetail?: string;
  failedStepIndex?: number;
  failedStepAction?: string;
  screenshots: string[];
  videoUrl?: string;
  logs: StepLog[];
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  duration: number;
}

@Injectable()
export class PlaywrightService {
  /**
   * Execute a single test case in a Playwright browser context.
   * Full implementation in Section 8.
   */
  executeTestCase(
    _testCase: TestCase,
    _environment: Environment | null,
    _runId: string,
  ): Promise<PlaywrightRunResult> {
    return Promise.reject(
      new Error(
        'PlaywrightService.executeTestCase is not yet implemented — see Section 8',
      ),
    );
  }
}
