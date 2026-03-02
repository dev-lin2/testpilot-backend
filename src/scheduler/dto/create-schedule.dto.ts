// src/scheduler/dto/create-schedule.dto.ts

import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  Matches,
} from 'class-validator';

export class CreateScheduleDto {
  @IsString()
  @IsNotEmpty()
  suiteId!: string;

  @IsString()
  @IsNotEmpty()
  // Basic 5-field cron expression validation
  @Matches(
    /^(\*|[0-9,\-*/]+)\s+(\*|[0-9,\-*/]+)\s+(\*|[0-9,\-*/]+)\s+(\*|[0-9,\-*/]+)\s+(\*|[0-9,\-*/]+)$/,
    {
      message:
        'cronExpr must be a valid 5-field cron expression (e.g. "0 2 * * *")',
    },
  )
  cronExpr!: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
