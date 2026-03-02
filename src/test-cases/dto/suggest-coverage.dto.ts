// src/test-cases/dto/suggest-coverage.dto.ts

import { IsString } from 'class-validator';

export class SuggestCoverageDto {
  @IsString()
  suiteId: string;

  @IsString()
  llmConfigId: string;
}
