// src/test-runs/dto/export-query.dto.ts

import { IsIn } from 'class-validator';

export class ExportQueryDto {
  @IsIn(['json', 'pdf'])
  format!: 'json' | 'pdf';
}
