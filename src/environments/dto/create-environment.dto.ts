// src/environments/dto/create-environment.dto.ts

import { IsString, IsOptional, IsObject, IsUrl } from 'class-validator';

export class CreateEnvironmentDto {
  @IsString()
  name: string;

  @IsUrl({ require_tld: false })
  baseUrl: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;
}
