// src/auth/auth.types.ts

import type { UserRole } from '@prisma/client';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthResult extends TokenPair {
  user: AuthUser;
}
