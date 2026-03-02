// src/users/dto/create-api-key.dto.ts

import { IsString, MinLength } from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  @MinLength(1)
  name: string;
}
