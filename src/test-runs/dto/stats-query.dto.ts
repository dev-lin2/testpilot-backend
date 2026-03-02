// src/test-runs/dto/stats-query.dto.ts

import { IsOptional, IsString, IsDateString } from 'class-validator';

export class StatsQueryDto {
  @IsOptional()
  @IsString()
  suiteId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
