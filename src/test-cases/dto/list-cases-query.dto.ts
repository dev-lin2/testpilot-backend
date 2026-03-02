// src/test-cases/dto/list-cases-query.dto.ts

import { IsOptional, IsString } from 'class-validator';

export class ListCasesQueryDto {
  @IsOptional()
  @IsString()
  tags?: string; // comma-separated

  @IsOptional()
  @IsString()
  search?: string;
}
