// src/test-cases/dto/test-step.dto.ts

import {
  IsString,
  IsOptional,
  IsIn,
  IsNumber,
  IsArray,
  Min,
} from 'class-validator';

const STEP_ACTIONS = [
  'goto',
  'click',
  'fill',
  'select',
  'wait',
  'wait_for_selector',
  'expect',
  'screenshot',
  'hover',
  'press_key',
  'scroll',
] as const;

const ASSERTION_TYPES = [
  'visible',
  'hidden',
  'contains_text',
  'equals_text',
  'url_contains',
  'url_equals',
  'count',
  'attribute_equals',
  'checked',
  'enabled',
  'disabled',
] as const;

export class TestStepDto {
  @IsString()
  id: string;

  @IsIn(STEP_ACTIONS)
  action: string;

  @IsOptional()
  @IsString()
  selector?: string;

  @IsOptional()
  @IsString()
  value?: string;

  @IsOptional()
  @IsIn(ASSERTION_TYPES)
  assertion?: string;

  @IsOptional()
  @IsString()
  assertionValue?: string;

  @IsOptional()
  @IsString()
  attribute?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  timeout?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];
}
