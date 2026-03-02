// src/test-runs/test-runs.controller.ts

import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Sse,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Observable, merge, fromEvent } from 'rxjs';
import { map, takeUntil, share, take } from 'rxjs/operators';
import type { Response } from 'express';
import { TestRunsService } from './test-runs.service';
import { ListRunsQueryDto } from './dto/list-runs-query.dto';
import { StatsQueryDto } from './dto/stats-query.dto';
import { ExportQueryDto } from './dto/export-query.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import type {
  TestRunListItem,
  TestRunDetail,
  TestRunStats,
  CompareResult,
} from './test-runs.types';
import type { PaginationMeta } from '../common/types/response.type';

interface MessageEvent {
  type?: string;
  data: string | object;
  id?: string;
  retry?: number;
}

@Controller('test-runs')
export class TestRunsController {
  constructor(
    private testRunsService: TestRunsService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {}

  // Static routes BEFORE parameterised routes

  @Get('stats')
  async getStats(
    @CurrentUser() user: JwtPayload,
    @Query() query: StatsQueryDto,
  ): Promise<{ success: boolean; data: TestRunStats }> {
    const data = await this.testRunsService.getStats(user.sub, query);
    return { success: true, data };
  }

  @Get()
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListRunsQueryDto,
  ): Promise<{
    success: boolean;
    data: TestRunListItem[];
    meta: PaginationMeta;
  }> {
    const result = await this.testRunsService.findAll(user.sub, query);
    return { success: true, ...result };
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: TestRunDetail }> {
    const data = await this.testRunsService.findOne(user.sub, id);
    return { success: true, data };
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: null; message: string }> {
    await this.testRunsService.cancel(user.sub, id);
    return { success: true, data: null, message: 'Test run cancelled' };
  }

  @Get(':id/compare/:otherId')
  async compare(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('otherId') otherId: string,
  ): Promise<{ success: boolean; data: CompareResult }> {
    const data = await this.testRunsService.compare(user.sub, id, otherId);
    return { success: true, data };
  }

  @Get(':id/export')
  async export(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query() query: ExportQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, filename, contentType } = await this.testRunsService.export(
      user.sub,
      id,
      query.format,
    );
    res.set('Content-Disposition', `attachment; filename="${filename}"`);
    res.set('Content-Type', contentType);
    res.send(buffer);
  }

  /**
   * SSE stream for live test run progress.
   * Auth via ?token=<accessToken> query param (EventSource doesn't support headers).
   */
  @Sse(':id/stream')
  @Public()
  stream(
    @Param('id') id: string,
    @Query('token') token: string,
  ): Observable<MessageEvent> {
    // Manually verify the JWT token from query param
    try {
      this.jwtService.verify(token, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or missing token');
    }

    const complete$ = fromEvent<object>(
      this.eventEmitter,
      `run.${id}.complete`,
    ).pipe(take(1), share());

    const error$ = fromEvent<object>(this.eventEmitter, `run.${id}.error`).pipe(
      take(1),
      share(),
    );

    const terminate$ = merge(complete$, error$).pipe(share());

    const stepUpdate$ = fromEvent<object>(
      this.eventEmitter,
      `run.${id}.step_update`,
    ).pipe(
      takeUntil(terminate$),
      map((data): MessageEvent => ({ type: 'step_update', data })),
    );

    const caseUpdate$ = fromEvent<object>(
      this.eventEmitter,
      `run.${id}.case_update`,
    ).pipe(
      takeUntil(terminate$),
      map((data): MessageEvent => ({ type: 'case_update', data })),
    );

    const complete$$ = complete$.pipe(
      map((data): MessageEvent => ({ type: 'run_complete', data })),
    );

    const error$$ = error$.pipe(
      map((data): MessageEvent => ({ type: 'error', data })),
    );

    return merge(stepUpdate$, caseUpdate$, complete$$, error$$);
  }
}
