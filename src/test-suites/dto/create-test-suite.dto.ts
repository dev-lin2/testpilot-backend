// src/test-suites/dto/create-test-suite.dto.ts

import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';

export class CreateTestSuiteDto {
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
  @IsBoolean()
  stopOnFail?: boolean;

  @IsOptional()
  @IsString()
  dependsOnId?: string;
}
