// src/test-suites/test-suites.service.ts

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { PrismaService } from '../prisma/prisma.service';
import { TestRunStatus, Prisma } from '@prisma/client';
import type { TestSuite } from '@prisma/client';

interface BullQueue {
  add(name: string, data: Record<string, unknown>): Promise<unknown>;
}
import type { CreateTestSuiteDto } from './dto/create-test-suite.dto';
import type { UpdateTestSuiteDto } from './dto/update-test-suite.dto';
import type { RunSuiteDto } from './dto/run-suite.dto';
import type { ListSuitesQueryDto } from './dto/list-suites-query.dto';
import type {
  TestSuiteListItem,
  TestSuiteDetail,
  RunQueuedResponse,
  SuiteListResult,
} from './test-suites.types';

export const TEST_RUNS_QUEUE = 'test-runs';

@Injectable()
export class TestSuitesService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue(TEST_RUNS_QUEUE) private testRunsQueue: BullQueue,
  ) {}

  async findAll(userId: string, query: ListSuitesQueryDto): Promise<SuiteListResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const tagList = query.tags ? query.tags.split(',').map((t) => t.trim()) : undefined;

    const where = {
      userId,
      deletedAt: query.archived ? { not: null as Date | null } : null,
      ...(tagList && tagList.length > 0 && { tags: { hasSome: tagList } }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' as const } },
          { description: { contains: query.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [suites, total] = await Promise.all([
      this.prisma.testSuite.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { testCases: { where: { deletedAt: null } } } },
          testRuns: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { status: true, createdAt: true },
          },
        },
      }),
      this.prisma.testSuite.count({ where }),
    ]);

    const data: TestSuiteListItem[] = suites.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      tags: s.tags,
      stopOnFail: s.stopOnFail,
      dependsOnId: s.dependsOnId,
      caseCount: s._count.testCases,
      lastRunStatus: s.testRuns[0]?.status ?? null,
      lastRunAt: s.testRuns[0]?.createdAt ?? null,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(userId: string, id: string): Promise<TestSuiteDetail> {
    const suite = await this.prisma.testSuite.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: { select: { testCases: { where: { deletedAt: null } } } },
        testRuns: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { status: true, createdAt: true },
        },
        testCases: {
          where: { deletedAt: null },
          orderBy: { order: 'asc' },
          select: { id: true, name: true, order: true, tags: true },
        },
        schedules: {
          select: { id: true, cronExpr: true, enabled: true, nextRunAt: true },
        },
      },
    });

    if (!suite) throw new NotFoundException('Test suite not found');
    if (suite.userId !== userId) throw new ForbiddenException('Access denied');

    return {
      id: suite.id,
      name: suite.name,
      description: suite.description,
      tags: suite.tags,
      stopOnFail: suite.stopOnFail,
      dependsOnId: suite.dependsOnId,
      caseCount: suite._count.testCases,
      lastRunStatus: suite.testRuns[0]?.status ?? null,
      lastRunAt: suite.testRuns[0]?.createdAt ?? null,
      createdAt: suite.createdAt,
      updatedAt: suite.updatedAt,
      testCases: suite.testCases,
      schedules: suite.schedules,
    };
  }

  async create(userId: string, dto: CreateTestSuiteDto): Promise<TestSuiteListItem> {
    if (dto.dependsOnId) {
      await this.findOwnedOrThrow(userId, dto.dependsOnId);
    }

    const suite = await this.prisma.testSuite.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description ?? null,
        tags: dto.tags ?? [],
        stopOnFail: dto.stopOnFail ?? false,
        dependsOnId: dto.dependsOnId ?? null,
      },
    });

    return this.toListItem(suite, 0, null, null);
  }

  async update(userId: string, id: string, dto: UpdateTestSuiteDto): Promise<TestSuiteListItem> {
    await this.findOwnedOrThrow(userId, id);

    if (dto.dependsOnId) {
      if (dto.dependsOnId === id) {
        throw new BadRequestException('A suite cannot depend on itself');
      }
      await this.findOwnedOrThrow(userId, dto.dependsOnId);
    }

    const suite = await this.prisma.testSuite.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        ...(dto.stopOnFail !== undefined && { stopOnFail: dto.stopOnFail }),
        ...(dto.dependsOnId !== undefined && { dependsOnId: dto.dependsOnId }),
      },
    });

    const caseCount = await this.prisma.testCase.count({
      where: { suiteId: id, deletedAt: null },
    });
    const lastRun = await this.prisma.testRun.findFirst({
      where: { suiteId: id },
      orderBy: { createdAt: 'desc' },
      select: { status: true, createdAt: true },
    });

    return this.toListItem(suite, caseCount, lastRun?.status ?? null, lastRun?.createdAt ?? null);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOwnedOrThrow(userId, id);
    await this.prisma.testSuite.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async run(userId: string, suiteId: string, dto: RunSuiteDto): Promise<RunQueuedResponse> {
    await this.findOwnedOrThrow(userId, suiteId);

    const totalCases = await this.prisma.testCase.count({
      where: { suiteId, deletedAt: null },
    });

    const run = await this.prisma.testRun.create({
      data: {
        userId,
        suiteId,
        environmentId: dto.environmentId ?? null,
        status: TestRunStatus.PENDING,
        failedOnly: dto.failedOnly ?? false,
        totalCases,
      },
    });

    await this.testRunsQueue.add('execute-run', { runId: run.id });

    return { runId: run.id, status: run.status };
  }

  async duplicate(userId: string, id: string): Promise<TestSuiteListItem> {
    const suite = await this.prisma.testSuite.findFirst({
      where: { id, deletedAt: null },
      include: { testCases: { where: { deletedAt: null }, orderBy: { order: 'asc' } } },
    });

    if (!suite) throw new NotFoundException('Test suite not found');
    if (suite.userId !== userId) throw new ForbiddenException('Access denied');

    const newSuite = await this.prisma.testSuite.create({
      data: {
        userId,
        name: `${suite.name} (Copy)`,
        description: suite.description,
        tags: suite.tags,
        stopOnFail: suite.stopOnFail,
        dependsOnId: null,
      },
    });

    if (suite.testCases.length > 0) {
      await this.prisma.testCase.createMany({
        data: suite.testCases.map((tc) => ({
          suiteId: newSuite.id,
          llmConfigId: tc.llmConfigId,
          name: tc.name,
          description: tc.description,
          tags: tc.tags,
          steps: tc.steps as Prisma.InputJsonValue,
          variables: tc.variables as Prisma.InputJsonValue,
          order: tc.order,
          captureScreenshots: tc.captureScreenshots,
          captureVideo: tc.captureVideo,
        })),
      });
    }

    return this.toListItem(newSuite, suite.testCases.length, null, null);
  }

  private async findOwnedOrThrow(userId: string, id: string): Promise<TestSuite> {
    const suite = await this.prisma.testSuite.findFirst({
      where: { id, deletedAt: null },
    });

    if (!suite) throw new NotFoundException('Test suite not found');
    if (suite.userId !== userId) throw new ForbiddenException('Access denied');

    return suite;
  }

  private toListItem(
    suite: TestSuite,
    caseCount: number,
    lastRunStatus: TestRunStatus | null,
    lastRunAt: Date | null,
  ): TestSuiteListItem {
    return {
      id: suite.id,
      name: suite.name,
      description: suite.description,
      tags: suite.tags,
      stopOnFail: suite.stopOnFail,
      dependsOnId: suite.dependsOnId,
      caseCount,
      lastRunStatus,
      lastRunAt,
      createdAt: suite.createdAt,
      updatedAt: suite.updatedAt,
    };
  }
}
