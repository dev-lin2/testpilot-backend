// src/test-suites/dto/run-suite.dto.ts

import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class RunSuiteDto {
  @IsOptional()
  @IsString()
  environmentId?: string;

  @IsOptional()
  @IsBoolean()
  failedOnly?: boolean;
}
