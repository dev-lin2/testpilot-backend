// src/test-cases/dto/generate-test-case.dto.ts

import { IsString, IsUrl } from 'class-validator';

export class GenerateTestCaseDto {
  @IsString()
  suiteId: string;

  @IsString()
  llmConfigId: string;

  @IsString()
  description: string;

  @IsUrl({ require_tld: false })
  baseUrl: string;
}
