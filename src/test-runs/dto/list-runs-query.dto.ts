// src/test-runs/dto/list-runs-query.dto.ts

import { IsOptional, IsString, IsNumberString, IsIn } from 'class-validator';

const RUN_STATUSES = [
  'PENDING',
  'RUNNING',
  'PASSED',
  'FAILED',
  'PARTIAL',
  'CANCELLED',
  'ERROR',
] as const;

export class ListRunsQueryDto {
  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;

  @IsOptional()
  @IsString()
  suiteId?: string;

  @IsOptional()
  @IsIn(RUN_STATUSES)
  status?: (typeof RUN_STATUSES)[number];
}
