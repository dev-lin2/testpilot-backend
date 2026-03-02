// src/test-suites/test-suites.types.ts

import type { TestRunStatus } from '@prisma/client';
import type { PaginationMeta } from '../common/types/response.type';

export interface TestSuiteListItem {
  id: string;
  name: string;
  description: string | null;
  tags: string[];
  stopOnFail: boolean;
  dependsOnId: string | null;
  caseCount: number;
  lastRunStatus: TestRunStatus | null;
  lastRunAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestSuiteDetail extends TestSuiteListItem {
  testCases: TestCaseSummary[];
  schedules: ScheduleSummary[];
}

export interface TestCaseSummary {
  id: string;
  name: string;
  order: number;
  tags: string[];
}

export interface ScheduleSummary {
  id: string;
  cronExpr: string;
  enabled: boolean;
  nextRunAt: Date | null;
}

export interface RunQueuedResponse {
  runId: string;
  status: TestRunStatus;
}

export interface SuiteListResult {
  data: TestSuiteListItem[];
  meta: PaginationMeta;
}
