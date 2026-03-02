// src/test-runs/test-runs.processor.ts

import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { PlaywrightService } from '../playwright/playwright.service';
import { TestRunStatus, TestResultStatus } from '@prisma/client';
import type { Job } from 'bull';

interface ExecuteRunPayload {
  runId: string;
}

@Processor('test-runs')
export class TestRunsProcessor {
  private readonly logger = new Logger(TestRunsProcessor.name);

  constructor(
    private prisma: PrismaService,
    private playwrightService: PlaywrightService,
    private eventEmitter: EventEmitter2,
  ) {}

  @Process('execute-run')
  async handleExecuteRun(job: Job<ExecuteRunPayload>): Promise<void> {
    const { runId } = job.data;
    this.logger.log(`Processing test run: ${runId}`);

    const run = await this.prisma.testRun.findFirst({
      where: { id: runId },
      include: {
        environment: true,
        suite: {
          include: {
            testCases: {
              where: { deletedAt: null },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!run) {
      this.logger.error(`Run ${runId} not found`);
      return;
    }

    // If already cancelled, skip
    if (run.status === TestRunStatus.CANCELLED) {
      this.logger.log(`Run ${runId} was cancelled before processing`);
      return;
    }

    // Mark as RUNNING
    await this.prisma.testRun.update({
      where: { id: runId },
      data: { status: TestRunStatus.RUNNING, startedAt: new Date() },
    });

    this.eventEmitter.emit('test-run.started', {
      runId,
      userId: run.userId,
      status: 'RUNNING',
      suiteName: run.suite?.name ?? null,
      totalCases: 0,
      passedCases: 0,
      failedCases: 0,
    });

    const testCases = run.suite?.testCases ?? [];

    // If single test case run (testCaseId is set), filter to just that case
    const casesToRun = run.testCaseId
      ? testCases.filter((tc) => tc.id === run.testCaseId)
      : testCases;

    // If failedOnly, only re-run failed cases from the most recent previous run
    let filteredCases = casesToRun;
    if (run.failedOnly && run.suiteId) {
      const previousRun = await this.prisma.testRun.findFirst({
        where: {
          suiteId: run.suiteId,
          id: { not: runId },
          status: { in: [TestRunStatus.FAILED, TestRunStatus.PARTIAL] },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          results: { where: { status: TestResultStatus.FAILED } },
        },
      });

      if (previousRun) {
        const failedCaseIds = new Set(
          previousRun.results.map((r) => r.testCaseId),
        );
        filteredCases = casesToRun.filter((tc) => failedCaseIds.has(tc.id));
      }
    }

    await this.prisma.testRun.update({
      where: { id: runId },
      data: { totalCases: filteredCases.length },
    });

    let passedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let totalTokensUsed = 0;
    let totalEstimatedCost = 0;

    const stopOnFail = run.suite?.stopOnFail ?? false;
    let shouldStop = false;

    for (const testCase of filteredCases) {
      // Re-check if cancelled mid-run
      const currentRun = await this.prisma.testRun.findFirst({
        where: { id: runId },
        select: { status: true },
      });

      if (currentRun?.status === TestRunStatus.CANCELLED) {
        this.logger.log(`Run ${runId} cancelled mid-execution`);
        skippedCount += filteredCases.length - passedCount - failedCount;
        break;
      }

      if (shouldStop) {
        // Skip remaining cases due to stopOnFail
        await this.prisma.testResult.create({
          data: {
            runId,
            testCaseId: testCase.id,
            status: TestResultStatus.SKIPPED,
            reason: 'Skipped due to previous failure (stopOnFail)',
            screenshots: [],
            logs: [],
          },
        });
        skippedCount++;
        continue;
      }

      try {
        const result = await this.playwrightService.executeTestCase(
          testCase,
          run.environment,
          runId,
        );

        await this.prisma.testResult.create({
          data: {
            runId,
            testCaseId: testCase.id,
            llmConfigId: testCase.llmConfigId,
            status: result.status,
            reason: result.reason ?? null,
            errorDetail: result.errorDetail ?? null,
            failedStepIndex: result.failedStepIndex ?? null,
            failedStepAction: result.failedStepAction ?? null,
            screenshots: result.screenshots,
            videoUrl: result.videoUrl ?? null,
            logs: result.logs as object[],
            promptTokens: result.promptTokens,
            completionTokens: result.completionTokens,
            totalTokens: result.totalTokens,
            estimatedCost: result.estimatedCost,
            duration: result.duration,
          },
        });

        if (result.status === TestResultStatus.PASSED) {
          passedCount++;
        } else if (result.status === TestResultStatus.FAILED) {
          failedCount++;
          if (stopOnFail) shouldStop = true;
        } else {
          skippedCount++;
        }

        totalPromptTokens += result.promptTokens;
        totalCompletionTokens += result.completionTokens;
        totalTokensUsed += result.totalTokens;
        totalEstimatedCost += result.estimatedCost;

        this.eventEmitter.emit(`run.${runId}.case_update`, {
          testCaseId: testCase.id,
          testCaseName: testCase.name,
          status: result.status,
          totalTokens: result.totalTokens,
        });
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        this.logger.error(
          `Test case ${testCase.id} failed with error: ${errorMessage}`,
        );

        await this.prisma.testResult.create({
          data: {
            runId,
            testCaseId: testCase.id,
            status: TestResultStatus.ERROR,
            reason: 'Executor error',
            errorDetail: errorMessage,
            screenshots: [],
            logs: [],
          },
        });

        failedCount++;
        if (stopOnFail) shouldStop = true;

        this.eventEmitter.emit(`run.${runId}.case_update`, {
          testCaseId: testCase.id,
          testCaseName: testCase.name,
          status: TestResultStatus.ERROR,
          totalTokens: 0,
        });
      }
    }

    // Determine final status
    let finalStatus: TestRunStatus;
    if (failedCount === 0 && skippedCount === 0) {
      finalStatus = TestRunStatus.PASSED;
    } else if (passedCount === 0 && skippedCount === 0) {
      finalStatus = TestRunStatus.FAILED;
    } else {
      finalStatus = TestRunStatus.PARTIAL;
    }

    // Check if still cancelled
    const finalRun = await this.prisma.testRun.findFirst({
      where: { id: runId },
      select: { status: true },
    });

    if (finalRun?.status !== TestRunStatus.CANCELLED) {
      await this.prisma.testRun.update({
        where: { id: runId },
        data: {
          status: finalStatus,
          passedCases: passedCount,
          failedCases: failedCount,
          skippedCases: skippedCount,
          totalPromptTokens,
          totalCompletionTokens,
          totalTokensUsed,
          estimatedCost: totalEstimatedCost,
          finishedAt: new Date(),
        },
      });
    }

    this.eventEmitter.emit(`run.${runId}.complete`, {
      runId,
      status: finalStatus,
      totalTokens: totalTokensUsed,
      estimatedCost: totalEstimatedCost,
    });

    this.eventEmitter.emit('test-run.completed', {
      runId,
      userId: run.userId,
      status: finalStatus,
      suiteName: run.suite?.name ?? null,
      totalCases: filteredCases.length,
      passedCases: passedCount,
      failedCases: failedCount,
    });

    this.logger.log(
      `Run ${runId} finished with status ${finalStatus}: ${passedCount} passed, ${failedCount} failed, ${skippedCount} skipped`,
    );
  }
}
