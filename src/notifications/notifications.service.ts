// src/notifications/notifications.service.ts

import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationEvent } from '@prisma/client';
import * as nodemailer from 'nodemailer';
import axios from 'axios';
import type { CreateNotificationConfigDto } from './dto/create-notification-config.dto';
import type { UpdateNotificationConfigDto } from './dto/update-notification-config.dto';
import type {
  NotificationConfigResponse,
  TestRunEvent,
} from './notifications.types';

// Map run statuses to NotificationEvent enum values
const STATUS_TO_EVENT: Record<string, NotificationEvent | undefined> = {
  RUNNING: NotificationEvent.RUN_STARTED,
  PASSED: NotificationEvent.RUN_PASSED,
  FAILED: NotificationEvent.RUN_FAILED,
  PARTIAL: NotificationEvent.RUN_PARTIAL,
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST', 'localhost'),
      port: this.configService.get<number>('SMTP_PORT', 587),
      auth: {
        user: this.configService.get<string>('SMTP_USER', ''),
        pass: this.configService.get<string>('SMTP_PASS', ''),
      },
    });
  }

  async findAll(userId: string): Promise<NotificationConfigResponse[]> {
    const configs = await this.prisma.notificationConfig.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return configs.map((c) => this.toResponse(c));
  }

  async create(
    userId: string,
    dto: CreateNotificationConfigDto,
  ): Promise<NotificationConfigResponse> {
    const config = await this.prisma.notificationConfig.create({
      data: {
        userId,
        type: dto.type,
        target: dto.target,
        events: dto.events as NotificationEvent[],
        enabled: dto.enabled ?? true,
      },
    });
    return this.toResponse(config);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateNotificationConfigDto,
  ): Promise<NotificationConfigResponse> {
    await this.findOwnedOrThrow(userId, id);

    const config = await this.prisma.notificationConfig.update({
      where: { id },
      data: {
        ...(dto.target !== undefined && { target: dto.target }),
        ...(dto.events !== undefined && {
          events: dto.events as NotificationEvent[],
        }),
        ...(dto.enabled !== undefined && { enabled: dto.enabled }),
      },
    });
    return this.toResponse(config);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOwnedOrThrow(userId, id);
    await this.prisma.notificationConfig.delete({ where: { id } });
  }

  // ─── Event Handlers ───────────────────────────────────────────────────────

  @OnEvent('test-run.started')
  async handleRunStarted(event: TestRunEvent): Promise<void> {
    await this.dispatchForStatus(event, 'RUNNING');
  }

  @OnEvent('test-run.completed')
  async handleRunCompleted(event: TestRunEvent): Promise<void> {
    await this.dispatchForStatus(event, event.status);
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private async dispatchForStatus(
    event: TestRunEvent,
    status: string,
  ): Promise<void> {
    const notifEvent = STATUS_TO_EVENT[status];
    if (!notifEvent) return; // CANCELLED / ERROR → no notification

    let configs: Awaited<
      ReturnType<typeof this.prisma.notificationConfig.findMany>
    >;

    try {
      configs = await this.prisma.notificationConfig.findMany({
        where: {
          userId: event.userId,
          enabled: true,
          events: { has: notifEvent },
        },
      });
    } catch (err: unknown) {
      this.logger.error(
        `Failed to query notification configs: ${err instanceof Error ? err.message : String(err)}`,
      );
      return;
    }

    for (const config of configs) {
      if (config.type === 'email') {
        await this.sendEmail(config.target, notifEvent, event);
      } else if (config.type === 'webhook') {
        await this.sendWebhook(config.target, notifEvent, event);
      }
    }
  }

  private async sendEmail(
    to: string,
    event: NotificationEvent,
    run: TestRunEvent,
  ): Promise<void> {
    const subject = `[TestPilot] ${run.suiteName ?? 'Run'} — ${event.replace('_', ' ')}`;
    const html = `
      <h2>TestPilot Notification: ${event}</h2>
      <table>
        <tr><td><strong>Run ID</strong></td><td>${run.runId}</td></tr>
        <tr><td><strong>Suite</strong></td><td>${run.suiteName ?? 'N/A'}</td></tr>
        <tr><td><strong>Status</strong></td><td>${run.status}</td></tr>
        <tr><td><strong>Total Cases</strong></td><td>${run.totalCases}</td></tr>
        <tr><td><strong>Passed</strong></td><td>${run.passedCases}</td></tr>
        <tr><td><strong>Failed</strong></td><td>${run.failedCases}</td></tr>
      </table>
    `;

    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>(
          'SMTP_FROM',
          'noreply@testpilot.dev',
        ),
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent to ${to} for event ${event}`);
    } catch (err: unknown) {
      this.logger.error(
        `Failed to send email to ${to}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private async sendWebhook(
    url: string,
    event: NotificationEvent,
    run: TestRunEvent,
  ): Promise<void> {
    const payload = {
      event,
      runId: run.runId,
      suiteName: run.suiteName,
      status: run.status,
      totalCases: run.totalCases,
      passedCases: run.passedCases,
      failedCases: run.failedCases,
      timestamp: new Date().toISOString(),
    };

    try {
      await axios.post(url, payload, { timeout: 10_000 });
      this.logger.log(`Webhook sent to ${url} for event ${event}`);
    } catch (err: unknown) {
      this.logger.error(
        `Failed to send webhook to ${url}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private async findOwnedOrThrow(userId: string, id: string) {
    const config = await this.prisma.notificationConfig.findFirst({
      where: { id },
    });
    if (!config) throw new NotFoundException('Notification config not found');
    if (config.userId !== userId) throw new ForbiddenException('Access denied');
    return config;
  }

  private toResponse(config: {
    id: string;
    type: string;
    target: string;
    events: NotificationEvent[];
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): NotificationConfigResponse {
    return {
      id: config.id,
      type: config.type,
      target: config.target,
      events: config.events,
      enabled: config.enabled,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }
}
