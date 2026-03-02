// src/scheduler/dto/update-schedule.dto.ts

import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  Matches,
} from 'class-validator';

export class UpdateScheduleDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(
    /^(\*|[0-9,\-*/]+)\s+(\*|[0-9,\-*/]+)\s+(\*|[0-9,\-*/]+)\s+(\*|[0-9,\-*/]+)\s+(\*|[0-9,\-*/]+)$/,
    {
      message:
        'cronExpr must be a valid 5-field cron expression (e.g. "0 6 * * *")',
    },
  )
  cronExpr?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
