// src/test-cases/test-cases.service.ts

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { TestRunStatus, Prisma } from '@prisma/client';
import type { TestCase } from '@prisma/client';
import type { CreateTestCaseDto } from './dto/create-test-case.dto';
import type { UpdateTestCaseDto } from './dto/update-test-case.dto';
import type { ListCasesQueryDto } from './dto/list-cases-query.dto';
import type { ReorderCasesDto } from './dto/reorder-cases.dto';
import type { GenerateTestCaseDto } from './dto/generate-test-case.dto';
import type { SuggestCoverageDto } from './dto/suggest-coverage.dto';
import type { ValidateSelectorsDto } from './dto/validate-selectors.dto';
import type { RunCaseDto } from './dto/run-case.dto';
import type {
  TestCaseResponse,
  RunQueuedResponse,
  GenerateResult,
  SuggestCoverageResult,
  ValidateSelectorsResult,
  CoverageSuggestion,
} from './test-cases.types';
import type { TestStep } from '../common/types/step.type';

export const TEST_RUNS_QUEUE = 'test-runs';

interface BullQueue {
  add(name: string, data: Record<string, unknown>): Promise<unknown>;
}

@Injectable()
export class TestCasesService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    @InjectQueue(TEST_RUNS_QUEUE) private testRunsQueue: BullQueue,
  ) {}

  async listBySuite(userId: string, suiteId: string, query: ListCasesQueryDto): Promise<TestCaseResponse[]> {
    await this.verifySuiteOwnership(userId, suiteId);

    const tagList = query.tags ? query.tags.split(',').map((t) => t.trim()) : undefined;

    const cases = await this.prisma.testCase.findMany({
      where: {
        suiteId,
        deletedAt: null,
        ...(tagList && { tags: { hasSome: tagList } }),
        ...(query.search && {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { order: 'asc' },
      include: {
        testResults: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { status: true },
        },
      },
    });

    return cases.map((c) => this.toResponse(c, c.testResults[0]?.status ?? null));
  }

  async findOne(userId: string, id: string): Promise<TestCaseResponse> {
    const tc = await this.findOwnedOrThrow(userId, id);
    const lastResult = await this.prisma.testResult.findFirst({
      where: { testCaseId: id },
      orderBy: { createdAt: 'desc' },
      select: { status: true },
    });
    return this.toResponse(tc, lastResult?.status ?? null);
  }

  async create(userId: string, dto: CreateTestCaseDto): Promise<TestCaseResponse> {
    await this.verifySuiteOwnership(userId, dto.suiteId);

    const maxOrder = await this.prisma.testCase.aggregate({
      where: { suiteId: dto.suiteId, deletedAt: null },
      _max: { order: true },
    });

    const tc = await this.prisma.testCase.create({
      data: {
        suiteId: dto.suiteId,
        llmConfigId: dto.llmConfigId ?? null,
        name: dto.name,
        description: dto.description ?? null,
        tags: dto.tags ?? [],
        steps: dto.steps as unknown as Prisma.InputJsonValue,
        variables: (dto.variables ?? {}) as Prisma.InputJsonValue,
        order: (maxOrder._max.order ?? -1) + 1,
        captureScreenshots: dto.captureScreenshots ?? true,
        captureVideo: dto.captureVideo ?? false,
      },
    });

    return this.toResponse(tc, null);
  }

  async update(userId: string, id: string, dto: UpdateTestCaseDto): Promise<TestCaseResponse> {
    await this.findOwnedOrThrow(userId, id);

    const tc = await this.prisma.testCase.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        ...(dto.llmConfigId !== undefined && { llmConfigId: dto.llmConfigId }),
        ...(dto.captureScreenshots !== undefined && { captureScreenshots: dto.captureScreenshots }),
        ...(dto.captureVideo !== undefined && { captureVideo: dto.captureVideo }),
        ...(dto.variables !== undefined && { variables: dto.variables as Prisma.InputJsonValue }),
        ...(dto.steps !== undefined && { steps: dto.steps as unknown as Prisma.InputJsonValue }),
      },
    });

    const lastResult = await this.prisma.testResult.findFirst({
      where: { testCaseId: id },
      orderBy: { createdAt: 'desc' },
      select: { status: true },
    });

    return this.toResponse(tc, lastResult?.status ?? null);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOwnedOrThrow(userId, id);
    await this.prisma.testCase.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async run(userId: string, id: string, dto: RunCaseDto): Promise<RunQueuedResponse> {
    const tc = await this.findOwnedOrThrow(userId, id);

    const run = await this.prisma.testRun.create({
      data: {
        userId,
        suiteId: tc.suiteId,
        testCaseId: id,
        environmentId: dto.environmentId ?? null,
        status: TestRunStatus.PENDING,
        totalCases: 1,
      },
    });

    await this.testRunsQueue.add('execute-run', { runId: run.id });

    return { runId: run.id, status: run.status };
  }

  async duplicate(userId: string, id: string): Promise<TestCaseResponse> {
    const tc = await this.findOwnedOrThrow(userId, id);

    const maxOrder = await this.prisma.testCase.aggregate({
      where: { suiteId: tc.suiteId, deletedAt: null },
      _max: { order: true },
    });

    const newTc = await this.prisma.testCase.create({
      data: {
        suiteId: tc.suiteId,
        llmConfigId: tc.llmConfigId,
        name: `${tc.name} (Copy)`,
        description: tc.description,
        tags: tc.tags,
        steps: tc.steps as Prisma.InputJsonValue,
        variables: tc.variables as Prisma.InputJsonValue,
        order: (maxOrder._max.order ?? -1) + 1,
        captureScreenshots: tc.captureScreenshots,
        captureVideo: tc.captureVideo,
      },
    });

    return this.toResponse(newTc, null);
  }

  async reorder(userId: string, dto: ReorderCasesDto): Promise<void> {
    await this.verifySuiteOwnership(userId, dto.suiteId);

    await this.prisma.$transaction(
      dto.orders.map(({ id, order }) =>
        this.prisma.testCase.updateMany({
          where: { id, suiteId: dto.suiteId, deletedAt: null },
          data: { order },
        }),
      ),
    );
  }

  async generate(userId: string, dto: GenerateTestCaseDto): Promise<GenerateResult> {
    await this.verifySuiteOwnership(userId, dto.suiteId);

    const system = `You are a Playwright test automation expert. Generate a complete test case based on the user's description.
Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "name": "Test case name",
  "steps": [
    {
      "id": "unique-id",
      "action": "goto|click|fill|select|wait|wait_for_selector|expect|screenshot|hover|press_key|scroll",
      "selector": "CSS selector (omit for goto/wait)",
      "value": "URL for goto, text for fill, key for press_key",
      "assertion": "visible|hidden|contains_text|equals_text|url_contains|url_equals|count|attribute_equals|checked|enabled|disabled (only for expect)",
      "assertionValue": "expected value (only for some assertions)",
      "description": "human-readable step description"
    }
  ]
}`;

    const user = `Generate test steps for: ${dto.description}\nBase URL: ${dto.baseUrl}`;

    const result = await this.aiService.call(userId, dto.llmConfigId, { system, user });

    let parsed: { name: string; steps: TestStep[] };
    try {
      parsed = this.aiService.parseJsonResponse<{ name: string; steps: TestStep[] }>(result.content);
    } catch {
      throw new InternalServerErrorException('Failed to parse AI response as JSON');
    }

    // Ensure each step has a valid id
    const steps: TestStep[] = (parsed.steps ?? []).map((step) => ({
      ...step,
      id: step.id || crypto.randomUUID(),
    }));

    return {
      name: parsed.name,
      steps,
      tokensUsed: {
        prompt: result.promptTokens,
        completion: result.completionTokens,
        total: result.totalTokens,
      },
    };
  }

  async suggestCoverage(userId: string, dto: SuggestCoverageDto): Promise<SuggestCoverageResult> {
    await this.verifySuiteOwnership(userId, dto.suiteId);

    const suite = await this.prisma.testSuite.findFirst({
      where: { id: dto.suiteId, deletedAt: null },
      include: {
        testCases: {
          where: { deletedAt: null },
          select: { name: true, description: true },
        },
      },
    });

    if (!suite) throw new NotFoundException('Test suite not found');

    const existingTests = suite.testCases
      .map((tc) => `- ${tc.name}${tc.description ? `: ${tc.description}` : ''}`)
      .join('\n');

    const system = `You are a QA engineer. Given existing test cases for a test suite, suggest missing test coverage.
Return ONLY valid JSON (no markdown):
{
  "suggestions": [
    { "name": "Test name", "description": "What this test verifies", "priority": "high|medium|low" }
  ]
}`;

    const user = `Suite: "${suite.name}"${suite.description ? `\nDescription: ${suite.description}` : ''}
Existing tests:\n${existingTests || '(none yet)'}
Suggest missing test coverage.`;

    const result = await this.aiService.call(userId, dto.llmConfigId, { system, user });

    let parsed: { suggestions: CoverageSuggestion[] };
    try {
      parsed = this.aiService.parseJsonResponse<{ suggestions: CoverageSuggestion[] }>(result.content);
    } catch {
      throw new InternalServerErrorException('Failed to parse AI response as JSON');
    }

    return {
      suggestions: parsed.suggestions ?? [],
      tokensUsed: {
        prompt: result.promptTokens,
        completion: result.completionTokens,
        total: result.totalTokens,
      },
    };
  }

  async validateSelectors(
    userId: string,
    id: string,
    dto: ValidateSelectorsDto,
  ): Promise<ValidateSelectorsResult> {
    const tc = await this.findOwnedOrThrow(userId, id);
    const steps = tc.steps as unknown as TestStep[];

    let baseUrl = '';
    if (dto.environmentId) {
      const env = await this.prisma.environment.findFirst({
        where: { id: dto.environmentId, deletedAt: null },
      });
      if (env) baseUrl = env.baseUrl;
    }

    const gotoStep = steps.find((s) => s.action === 'goto');
    const navigationUrl = gotoStep?.value
      ? this.substituteVariables(gotoStep.value, { baseUrl })
      : baseUrl;

    if (!navigationUrl) {
      throw new BadRequestException(
        'Cannot determine navigation URL: provide an environmentId or ensure the first step is goto',
      );
    }

    const stepsWithSelectors = steps.filter((s) => s.selector);

    // Dynamic import to avoid startup failure if browsers not installed
    let chromium: import('playwright').BrowserType;
    try {
      const pw = await import('playwright');
      chromium = pw.chromium;
    } catch {
      throw new InternalServerErrorException(
        'Playwright not available. Run: npx playwright install chromium',
      );
    }

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const results: ValidateSelectorsResult['results'] = [];

    try {
      await page.goto(navigationUrl, { timeout: 15000 });

      for (const step of stepsWithSelectors) {
        if (!step.selector) continue;
        const selector = this.substituteVariables(step.selector, { baseUrl });
        try {
          const count = await page.locator(selector).count();
          results.push({ stepId: step.id, selector: step.selector, found: count > 0 });
        } catch {
          results.push({ stepId: step.id, selector: step.selector, found: false });
        }
      }
    } finally {
      await browser.close();
    }

    return { valid: results.every((r) => r.found), results };
  }

  private substituteVariables(text: string, vars: Record<string, string>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? `{{${key}}}`);
  }

  private async verifySuiteOwnership(userId: string, suiteId: string): Promise<void> {
    const suite = await this.prisma.testSuite.findFirst({
      where: { id: suiteId, userId, deletedAt: null },
    });
    if (!suite) throw new NotFoundException('Test suite not found');
  }

  private async findOwnedOrThrow(userId: string, id: string): Promise<TestCase> {
    const tc = await this.prisma.testCase.findFirst({
      where: { id, deletedAt: null },
      include: { suite: { select: { userId: true } } },
    });

    if (!tc) throw new NotFoundException('Test case not found');
    if ((tc as TestCase & { suite: { userId: string } }).suite.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return tc;
  }

  private toResponse(
    tc: TestCase,
    lastResultStatus: import('@prisma/client').TestResultStatus | null,
  ): TestCaseResponse {
    return {
      id: tc.id,
      suiteId: tc.suiteId,
      name: tc.name,
      description: tc.description,
      tags: tc.tags,
      order: tc.order,
      steps: tc.steps as unknown as TestStep[],
      llmConfigId: tc.llmConfigId,
      captureScreenshots: tc.captureScreenshots,
      captureVideo: tc.captureVideo,
      variables: tc.variables as Record<string, string>,
      lastResultStatus,
      createdAt: tc.createdAt,
      updatedAt: tc.updatedAt,
    };
  }
}
