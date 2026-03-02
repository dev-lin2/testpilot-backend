// src/users/users.types.ts

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export interface ApiKeyMasked {
  id: string;
  name: string;
  key: string;
  lastUsed: Date | null;
  createdAt: Date;
}

export interface ApiKeyCreated extends ApiKeyMasked {
  key: string;
}
