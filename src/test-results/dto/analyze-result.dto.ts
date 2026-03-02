// src/test-results/dto/analyze-result.dto.ts

import { IsString, IsNotEmpty } from 'class-validator';

export class AnalyzeResultDto {
  @IsString()
  @IsNotEmpty()
  llmConfigId!: string;
}
