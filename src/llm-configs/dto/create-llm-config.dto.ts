// src/llm-configs/dto/create-llm-config.dto.ts

import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsInt,
  IsPositive,
  Min,
  Max,
} from 'class-validator';
import { LLMProvider } from '@prisma/client';

export class CreateLlmConfigDto {
  @IsString()
  name: string;

  @IsEnum(LLMProvider)
  provider: LLMProvider;

  @IsString()
  model: string;

  @IsString()
  apiKey: string;

  @IsOptional()
  @IsString()
  baseUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  maxTokens?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  tokenBudget?: number;
}
