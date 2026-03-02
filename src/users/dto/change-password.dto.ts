// src/users/dto/change-password.dto.ts

import { IsString, MinLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/, {
    message:
      'newPassword must contain uppercase, lowercase, number, and special character',
  })
  newPassword: string;
}
