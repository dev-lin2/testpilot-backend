// src/environments/environments.types.ts

export interface EnvironmentResponse {
  id: string;
  name: string;
  baseUrl: string;
  variables: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}
