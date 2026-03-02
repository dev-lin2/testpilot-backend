// src/scheduler/scheduler.service.ts

import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateScheduleDto } from './dto/create-schedule.dto';
import type { UpdateScheduleDto } from './dto/update-schedule.dto';
import type { ScheduleResponse } from './scheduler.types';

const TEST_RUNS_QUEUE = 'test-runs';

interface BullQueue {
  add(name: string, data: object, opts?: object): Promise<unknown>;
}

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue(TEST_RUNS_QUEUE) private queue: BullQueue,
  ) {}

  async findAll(userId: string): Promise<ScheduleResponse[]> {
    const schedules = await this.prisma.schedule.findMany({
      where: { suite: { userId } },
      include: { suite: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return schedules.map((s) => this.toResponse(s));
  }

  async create(
    userId: string,
    dto: CreateScheduleDto,
  ): Promise<ScheduleResponse> {
    // Verify suite ownership
    const suite = await this.prisma.testSuite.findFirst({
      where: { id: dto.suiteId, userId, deletedAt: null },
    });
    if (!suite) throw new NotFoundException('Test suite not found');

    const timezone = dto.timezone ?? 'UTC';
    const nextRunAt = this.getNextRunAt(dto.cronExpr, timezone);

    const schedule = await this.prisma.schedule.create({
      data: {
        suiteId: dto.suiteId,
        cronExpr: dto.cronExpr,
        timezone,
        enabled: dto.enabled ?? true,
        nextRunAt,
      },
      include: { suite: { select: { name: true } } },
    });

    return this.toResponse(schedule);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateScheduleDto,
  ): Promise<ScheduleResponse> {
    await this.findOwnedOrThrow(userId, id);

    const existing = await this.prisma.schedule.findFirst({ where: { id } });
    if (!existing) throw new NotFoundException('Schedule not found');

    // Recalculate nextRunAt if cron expression or timezone changes
    const newCronExpr = dto.cronExpr ?? existing.cronExpr;
    const newTimezone = dto.timezone ?? existing.timezone;
    const cronChanged =
      dto.cronExpr !== undefined || dto.timezone !== undefined;

    const schedule = await this.prisma.schedule.update({
      where: { id },
      data: {
        ...(dto.cronExpr !== undefined && { cronExpr: dto.cronExpr }),
        ...(dto.timezone !== undefined && { timezone: dto.timezone }),
        ...(dto.enabled !== undefined && { enabled: dto.enabled }),
        ...(cronChanged && {
          nextRunAt: this.getNextRunAt(newCronExpr, newTimezone),
        }),
      },
      include: { suite: { select: { name: true } } },
    });

    return this.toResponse(schedule);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOwnedOrThrow(userId, id);
    await this.prisma.schedule.delete({ where: { id } });
  }

  // ─── Cron Tick ────────────────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_MINUTE)
  async tick(): Promise<void> {
    const now = new Date();

    const dueSchedules = await this.prisma.schedule.findMany({
      where: {
        enabled: true,
        nextRunAt: { lte: now },
      },
      include: {
        suite: { select: { userId: true, deletedAt: true } },
      },
    });

    for (const schedule of dueSchedules) {
      // Skip if the suite was soft-deleted since the schedule was created
      if (schedule.suite.deletedAt !== null) continue;

      try {
        const run = await this.prisma.testRun.create({
          data: {
            userId: schedule.suite.userId,
            suiteId: schedule.suiteId,
            status: 'PENDING',
          },
        });

        await this.queue.add('execute-run', { runId: run.id });

        await this.prisma.schedule.update({
          where: { id: schedule.id },
          data: {
            lastRunAt: now,
            nextRunAt: this.getNextRunAt(schedule.cronExpr, schedule.timezone),
          },
        });

        this.logger.log(`Schedule ${schedule.id} triggered → run ${run.id}`);
      } catch (err: unknown) {
        this.logger.error(
          `Failed to trigger schedule ${schedule.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private getNextRunAt(cronExpr: string, timezone: string): Date {
    try {
      const job = new CronJob(
        cronExpr,
        () => {
          // no-op — used only to calculate next date
        },
        null,
        false,
        timezone,
      );
      return job.nextDate().toJSDate();
    } catch {
      throw new BadRequestException(`Invalid cron expression: "${cronExpr}"`);
    }
  }

  private async findOwnedOrThrow(userId: string, id: string) {
    const schedule = await this.prisma.schedule.findFirst({
      where: { id },
      include: { suite: { select: { userId: true } } },
    });
    if (!schedule) throw new NotFoundException('Schedule not found');
    if (schedule.suite.userId !== userId)
      throw new ForbiddenException('Access denied');
    return schedule;
  }

  private toResponse(schedule: {
    id: string;
    suiteId: string;
    cronExpr: string;
    timezone: string;
    enabled: boolean;
    lastRunAt: Date | null;
    nextRunAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    suite: { name: string };
  }): ScheduleResponse {
    return {
      id: schedule.id,
      suiteId: schedule.suiteId,
      suiteName: schedule.suite.name,
      cronExpr: schedule.cronExpr,
      timezone: schedule.timezone,
      enabled: schedule.enabled,
      lastRunAt: schedule.lastRunAt,
      nextRunAt: schedule.nextRunAt,
      createdAt: schedule.createdAt,
      updatedAt: schedule.updatedAt,
    };
  }
}
