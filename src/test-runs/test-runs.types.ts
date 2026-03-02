// src/test-runs/test-runs.types.ts

export interface TestRunListItem {
  id: string;
  suiteId: string | null;
  testCaseId: string | null;
  suiteName: string | null;
  status: string;
  failedOnly: boolean;
  totalCases: number;
  passedCases: number;
  failedCases: number;
  skippedCases: number;
  totalTokensUsed: number;
  estimatedCost: number;
  startedAt: Date | null;
  finishedAt: Date | null;
  duration: number | null;
  createdAt: Date;
}

export interface TestRunResultSummary {
  id: string;
  testCaseId: string;
  testCaseName: string;
  status: string;
  reason: string | null;
  failedStepIndex: number | null;
  failedStepAction: string | null;
  duration: number;
  totalTokens: number;
  estimatedCost: number;
}

export interface TestRunDetail extends TestRunListItem {
  totalPromptTokens: number;
  totalCompletionTokens: number;
  environment: { id: string; name: string } | null;
  results: TestRunResultSummary[];
}

export interface TrendPoint {
  date: string;
  passed: number;
  failed: number;
  tokens: number;
}

export interface FailureGroup {
  reason: string;
  count: number;
}

export interface TestRunStats {
  totalRuns: number;
  passRate: number;
  totalTokensUsed: number;
  totalEstimatedCost: number;
  trend: TrendPoint[];
  failureGroups: FailureGroup[];
}

export interface RunCompareItem {
  id: string;
  status: string;
  passedCases: number;
  failedCases: number;
}

export interface CompareResult {
  runA: RunCompareItem;
  runB: RunCompareItem;
  diff: Array<{
    testCaseId: string;
    name: string;
    runAStatus: string;
    runBStatus: string;
  }>;
}
