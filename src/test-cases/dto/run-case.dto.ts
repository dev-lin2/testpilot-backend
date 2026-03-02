// src/test-cases/dto/run-case.dto.ts

import { IsOptional, IsString } from 'class-validator';

export class RunCaseDto {
  @IsOptional()
  @IsString()
  environmentId?: string;
}
