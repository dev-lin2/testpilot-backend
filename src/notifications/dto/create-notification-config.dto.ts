// src/notifications/dto/create-notification-config.dto.ts

import {
  IsString,
  IsNotEmpty,
  IsIn,
  IsArray,
  IsBoolean,
  IsOptional,
} from 'class-validator';

const NOTIFICATION_TYPES = ['email', 'webhook'] as const;
const NOTIFICATION_EVENTS = [
  'RUN_STARTED',
  'RUN_PASSED',
  'RUN_FAILED',
  'RUN_PARTIAL',
] as const;

export class CreateNotificationConfigDto {
  @IsIn(NOTIFICATION_TYPES)
  type!: (typeof NOTIFICATION_TYPES)[number];

  @IsString()
  @IsNotEmpty()
  target!: string;

  @IsArray()
  @IsIn(NOTIFICATION_EVENTS, { each: true })
  events!: (typeof NOTIFICATION_EVENTS)[number][];

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
