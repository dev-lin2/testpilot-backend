// src/test-results/test-results.service.ts

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import type { AnalyzeResultDto } from './dto/analyze-result.dto';
import type { StepLog } from '../common/types/step.type';
import type {
  TestResultDetail,
  AiAnalysis,
  AiAnalysisWithTokens,
  AutoHealSuggestion,
} from './test-results.types';

interface AiAnalysisRaw {
  summary: string;
  suggestion: string;
  autoHealSuggestion?: AutoHealSuggestion | null;
}

@Injectable()
export class TestResultsService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
  ) {}

  async findOne(userId: string, id: string): Promise<TestResultDetail> {
    const result = await this.prisma.testResult.findFirst({
      where: { id },
      include: {
        run: { select: { userId: true } },
        testCase: { select: { name: true } },
      },
    });

    if (!result) throw new NotFoundException('Test result not found');
    if (result.run.userId !== userId)
      throw new ForbiddenException('Access denied');

    return this.toDetail(result);
  }

  async analyze(
    userId: string,
    id: string,
    dto: AnalyzeResultDto,
  ): Promise<AiAnalysisWithTokens> {
    const result = await this.prisma.testResult.findFirst({
      where: { id },
      include: {
        run: { select: { userId: true } },
        testCase: { select: { name: true, steps: true } },
      },
    });

    if (!result) throw new NotFoundException('Test result not found');
    if (result.run.userId !== userId)
      throw new ForbiddenException('Access denied');

    const logs = result.logs as unknown as StepLog[];
    const logsText = logs
      .map(
        (l) =>
          `Step ${l.stepIndex} [${l.action}] ${l.description ?? ''}: ${l.status}` +
          (l.reason ? ` — ${l.reason}` : ''),
      )
      .join('\n');

    const systemPrompt = `You are an expert test automation engineer analyzing test failures.
Given the test name, failure reason, error details, and step logs, provide:
1. A clear human-readable summary of what went wrong
2. A practical suggestion to fix the issue
3. An auto-heal suggestion if a selector change could fix it

Respond in JSON:
{
  "summary": "...",
  "suggestion": "...",
  "autoHealSuggestion": { "stepIndex": 0, "newSelector": "..." } | null
}`;

    const userPrompt = `Test Case: ${(result.testCase as { name: string }).name}
Status: ${result.status}
Reason: ${result.reason ?? 'N/A'}
Error: ${result.errorDetail ?? 'N/A'}
Failed Step Index: ${result.failedStepIndex ?? 'N/A'}
Failed Step Action: ${result.failedStepAction ?? 'N/A'}

Step Logs:
${logsText}`;

    const aiResult = await this.aiService.call(userId, dto.llmConfigId, {
      system: systemPrompt,
      user: userPrompt,
    });

    const parsed = this.aiService.parseJsonResponse<AiAnalysisRaw>(
      aiResult.content,
    );

    const analysis: AiAnalysis = {
      summary: parsed.summary,
      suggestion: parsed.suggestion,
      autoHealSuggestion: parsed.autoHealSuggestion ?? null,
    };

    return {
      ...analysis,
      tokensUsed: {
        prompt: aiResult.promptTokens,
        completion: aiResult.completionTokens,
        total: aiResult.totalTokens,
      },
    };
  }

  private toDetail(result: {
    id: string;
    runId: string;
    testCaseId: string;
    status: string;
    reason: string | null;
    errorDetail: string | null;
    failedStepIndex: number | null;
    failedStepAction: string | null;
    screenshots: unknown;
    videoUrl: string | null;
    logs: unknown;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number;
    duration: number;
    testCase: { name: string };
  }): TestResultDetail {
    return {
      id: result.id,
      runId: result.runId,
      testCaseId: result.testCaseId,
      testCaseName: result.testCase.name,
      status: result.status,
      reason: result.reason,
      errorDetail: result.errorDetail,
      failedStepIndex: result.failedStepIndex,
      failedStepAction: result.failedStepAction,
      screenshots: result.screenshots as string[],
      videoUrl: result.videoUrl,
      logs: result.logs as StepLog[],
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      totalTokens: result.totalTokens,
      estimatedCost: result.estimatedCost,
      duration: result.duration,
      aiAnalysis: null,
    };
  }
}
