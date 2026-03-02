// src/environments/dto/update-environment.dto.ts

import { IsString, IsOptional, IsObject, IsUrl } from 'class-validator';

export class UpdateEnvironmentDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  baseUrl?: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;
}
