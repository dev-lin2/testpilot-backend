// src/test-runs/test-runs.service.ts

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TestRunStatus } from '@prisma/client';
import type { TestRun, TestResult } from '@prisma/client';
import type { ListRunsQueryDto } from './dto/list-runs-query.dto';
import type { StatsQueryDto } from './dto/stats-query.dto';
import type {
  TestRunListItem,
  TestRunDetail,
  TestRunResultSummary,
  TestRunStats,
  TrendPoint,
  FailureGroup,
  CompareResult,
} from './test-runs.types';
import type { PaginationMeta } from '../common/types/response.type';

interface RunWithRelations extends TestRun {
  suite: { name: string } | null;
}

interface RunListResult {
  data: TestRunListItem[];
  meta: PaginationMeta;
}

@Injectable()
export class TestRunsService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    userId: string,
    query: ListRunsQueryDto,
  ): Promise<RunListResult> {
    const page = Math.max(1, parseInt(query.page ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20', 10)));
    const skip = (page - 1) * limit;

    const where = {
      userId,
      ...(query.suiteId ? { suiteId: query.suiteId } : {}),
      ...(query.status ? { status: query.status as TestRunStatus } : {}),
    };

    const [runs, total] = await Promise.all([
      this.prisma.testRun.findMany({
        where,
        include: { suite: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.testRun.count({ where }),
    ]);

    const data = runs.map((r) => this.toListItem(r as RunWithRelations));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(userId: string, id: string): Promise<TestRunDetail> {
    const run = await this.prisma.testRun.findFirst({
      where: { id },
      include: {
        suite: { select: { name: true } },
        environment: { select: { id: true, name: true } },
        results: {
          include: { testCase: { select: { name: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!run) throw new NotFoundException('Test run not found');
    if (run.userId !== userId) throw new ForbiddenException('Access denied');

    const results: TestRunResultSummary[] = run.results.map((r) => ({
      id: r.id,
      testCaseId: r.testCaseId,
      testCaseName: (r.testCase as { name: string }).name,
      status: r.status,
      reason: r.reason,
      failedStepIndex: r.failedStepIndex,
      failedStepAction: r.failedStepAction,
      duration: r.duration,
      totalTokens: r.totalTokens,
      estimatedCost: r.estimatedCost,
    }));

    const duration =
      run.startedAt && run.finishedAt
        ? run.finishedAt.getTime() - run.startedAt.getTime()
        : null;

    return {
      id: run.id,
      suiteId: run.suiteId,
      testCaseId: run.testCaseId,
      suiteName: run.suite?.name ?? null,
      status: run.status,
      failedOnly: run.failedOnly,
      totalCases: run.totalCases,
      passedCases: run.passedCases,
      failedCases: run.failedCases,
      skippedCases: run.skippedCases,
      totalPromptTokens: run.totalPromptTokens,
      totalCompletionTokens: run.totalCompletionTokens,
      totalTokensUsed: run.totalTokensUsed,
      estimatedCost: run.estimatedCost,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      duration,
      createdAt: run.createdAt,
      environment: run.environment ?? null,
      results,
    };
  }

  async cancel(userId: string, id: string): Promise<void> {
    const run = await this.prisma.testRun.findFirst({ where: { id } });

    if (!run) throw new NotFoundException('Test run not found');
    if (run.userId !== userId) throw new ForbiddenException('Access denied');

    if (
      run.status === TestRunStatus.PASSED ||
      run.status === TestRunStatus.FAILED ||
      run.status === TestRunStatus.PARTIAL ||
      run.status === TestRunStatus.CANCELLED ||
      run.status === TestRunStatus.ERROR
    ) {
      throw new BadRequestException(
        'Cannot cancel a run that has already completed',
      );
    }

    await this.prisma.testRun.update({
      where: { id },
      data: {
        status: TestRunStatus.CANCELLED,
        finishedAt: new Date(),
      },
    });
  }

  async compare(
    userId: string,
    id: string,
    otherId: string,
  ): Promise<CompareResult> {
    const [runA, runB] = await Promise.all([
      this.prisma.testRun.findFirst({
        where: { id },
        include: {
          results: {
            include: { testCase: { select: { name: true } } },
          },
        },
      }),
      this.prisma.testRun.findFirst({
        where: { id: otherId },
        include: {
          results: {
            include: { testCase: { select: { name: true } } },
          },
        },
      }),
    ]);

    if (!runA) throw new NotFoundException(`Run ${id} not found`);
    if (!runB) throw new NotFoundException(`Run ${otherId} not found`);
    if (runA.userId !== userId || runB.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Build maps of testCaseId → result for each run
    const mapA = new Map<string, TestResult>(
      runA.results.map((r) => [r.testCaseId, r]),
    );
    const mapB = new Map<string, TestResult>(
      runB.results.map((r) => [r.testCaseId, r]),
    );

    // All test case IDs across both runs
    const allCaseIds = new Set([...mapA.keys(), ...mapB.keys()]);

    const diff: CompareResult['diff'] = [];

    for (const caseId of allCaseIds) {
      const resA = mapA.get(caseId);
      const resB = mapB.get(caseId);
      const statusA = resA?.status ?? 'NOT_RUN';
      const statusB = resB?.status ?? 'NOT_RUN';

      if (statusA !== statusB) {
        // Get name from whichever result is available
        const resultWithCase = (resA ?? resB) as TestResult & {
          testCase: { name: string };
        };
        diff.push({
          testCaseId: caseId,
          name: resultWithCase.testCase.name,
          runAStatus: statusA,
          runBStatus: statusB,
        });
      }
    }

    return {
      runA: {
        id: runA.id,
        status: runA.status,
        passedCases: runA.passedCases,
        failedCases: runA.failedCases,
      },
      runB: {
        id: runB.id,
        status: runB.status,
        passedCases: runB.passedCases,
        failedCases: runB.failedCases,
      },
      diff,
    };
  }

  async export(
    userId: string,
    id: string,
    format: 'json' | 'pdf',
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const run = await this.findOne(userId, id);

    if (format === 'pdf') {
      // Generate a human-readable text report (no external PDF library required)
      const lines: string[] = [
        `TestPilot Run Report`,
        `====================`,
        `Run ID:    ${run.id}`,
        `Suite:     ${run.suiteName ?? 'N/A'}`,
        `Status:    ${run.status}`,
        `Total:     ${run.totalCases} cases`,
        `Passed:    ${run.passedCases}`,
        `Failed:    ${run.failedCases}`,
        `Skipped:   ${run.skippedCases}`,
        `Tokens:    ${run.totalTokensUsed}`,
        `Cost:      $${run.estimatedCost.toFixed(4)}`,
        `Started:   ${run.startedAt?.toISOString() ?? 'N/A'}`,
        `Finished:  ${run.finishedAt?.toISOString() ?? 'N/A'}`,
        ``,
        `Results`,
        `-------`,
        ...run.results.map(
          (r) =>
            `  [${r.status.padEnd(7)}] ${r.testCaseName}` +
            (r.reason ? ` — ${r.reason}` : ''),
        ),
      ];

      const buffer = Buffer.from(lines.join('\n'), 'utf8');
      return {
        buffer,
        filename: `run-${run.id}.txt`,
        contentType: 'text/plain',
      };
    }

    const buffer = Buffer.from(JSON.stringify(run, null, 2), 'utf8');
    return {
      buffer,
      filename: `run-${run.id}.json`,
      contentType: 'application/json',
    };
  }

  async getStats(userId: string, query: StatsQueryDto): Promise<TestRunStats> {
    const fromDate = query.from ? new Date(query.from) : undefined;
    const toDate = query.to ? new Date(query.to) : undefined;

    const where = {
      userId,
      ...(query.suiteId ? { suiteId: query.suiteId } : {}),
      ...(fromDate || toDate
        ? {
            createdAt: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: toDate } : {}),
            },
          }
        : {}),
    };

    const runs = await this.prisma.testRun.findMany({
      where,
      select: {
        status: true,
        totalTokensUsed: true,
        estimatedCost: true,
        createdAt: true,
        passedCases: true,
        failedCases: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const totalRuns = runs.length;
    const passedRuns = runs.filter(
      (r) => r.status === TestRunStatus.PASSED,
    ).length;
    const passRate = totalRuns > 0 ? (passedRuns / totalRuns) * 100 : 0;
    const totalTokensUsed = runs.reduce((sum, r) => sum + r.totalTokensUsed, 0);
    const totalEstimatedCost = runs.reduce(
      (sum, r) => sum + r.estimatedCost,
      0,
    );

    // Build daily trend
    const trendMap = new Map<string, TrendPoint>();
    for (const run of runs) {
      const date = run.createdAt.toISOString().slice(0, 10);
      const existing = trendMap.get(date) ?? {
        date,
        passed: 0,
        failed: 0,
        tokens: 0,
      };
      if (run.status === TestRunStatus.PASSED) existing.passed += 1;
      else if (
        run.status === TestRunStatus.FAILED ||
        run.status === TestRunStatus.PARTIAL
      )
        existing.failed += 1;
      existing.tokens += run.totalTokensUsed;
      trendMap.set(date, existing);
    }
    const trend = Array.from(trendMap.values());

    // Failure groups from test results
    const failedResults = await this.prisma.testResult.findMany({
      where: {
        run: { userId, ...(query.suiteId ? { suiteId: query.suiteId } : {}) },
        status: 'FAILED',
        reason: { not: null },
      },
      select: { reason: true },
    });

    const reasonCount = new Map<string, number>();
    for (const r of failedResults) {
      if (r.reason) {
        reasonCount.set(r.reason, (reasonCount.get(r.reason) ?? 0) + 1);
      }
    }

    const failureGroups: FailureGroup[] = Array.from(reasonCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([reason, count]) => ({ reason, count }));

    return {
      totalRuns,
      passRate: Math.round(passRate * 10) / 10,
      totalTokensUsed,
      totalEstimatedCost: Math.round(totalEstimatedCost * 10000) / 10000,
      trend,
      failureGroups,
    };
  }

  private toListItem(run: RunWithRelations): TestRunListItem {
    const duration =
      run.startedAt && run.finishedAt
        ? run.finishedAt.getTime() - run.startedAt.getTime()
        : null;

    return {
      id: run.id,
      suiteId: run.suiteId,
      testCaseId: run.testCaseId,
      suiteName: run.suite?.name ?? null,
      status: run.status,
      failedOnly: run.failedOnly,
      totalCases: run.totalCases,
      passedCases: run.passedCases,
      failedCases: run.failedCases,
      skippedCases: run.skippedCases,
      totalTokensUsed: run.totalTokensUsed,
      estimatedCost: run.estimatedCost,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      duration,
      createdAt: run.createdAt,
    };
  }
}
