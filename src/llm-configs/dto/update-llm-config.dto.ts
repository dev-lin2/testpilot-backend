// src/llm-configs/dto/update-llm-config.dto.ts

import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  IsPositive,
  Min,
  Max,
} from 'class-validator';

export class UpdateLlmConfigDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  apiKey?: string;

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
