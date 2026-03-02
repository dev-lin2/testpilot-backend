// src/test-cases/dto/create-test-case.dto.ts

import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TestStepDto } from './test-step.dto';

export class CreateTestCaseDto {
  @IsString()
  suiteId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  llmConfigId?: string;

  @IsOptional()
  @IsBoolean()
  captureScreenshots?: boolean;

  @IsOptional()
  @IsBoolean()
  captureVideo?: boolean;

  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TestStepDto)
  steps: TestStepDto[];
}
