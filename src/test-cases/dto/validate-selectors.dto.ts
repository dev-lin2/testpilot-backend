// src/test-cases/dto/validate-selectors.dto.ts

import { IsOptional, IsString } from 'class-validator';

export class ValidateSelectorsDto {
  @IsOptional()
  @IsString()
  environmentId?: string;
}
