// src/notifications/dto/update-notification-config.dto.ts

import {
  IsString,
  IsNotEmpty,
  IsIn,
  IsArray,
  IsBoolean,
  IsOptional,
} from 'class-validator';

const NOTIFICATION_EVENTS = [
  'RUN_STARTED',
  'RUN_PASSED',
  'RUN_FAILED',
  'RUN_PARTIAL',
] as const;

export class UpdateNotificationConfigDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  target?: string;

  @IsOptional()
  @IsArray()
  @IsIn(NOTIFICATION_EVENTS, { each: true })
  events?: (typeof NOTIFICATION_EVENTS)[number][];

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
