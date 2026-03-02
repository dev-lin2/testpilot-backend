// src/notifications/notifications.types.ts

export interface NotificationConfigResponse {
  id: string;
  type: string;
  target: string;
  events: string[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Internal event payload emitted by the TestRuns processor.
 * Used by the NotificationsService @OnEvent handlers.
 */
export interface TestRunEvent {
  runId: string;
  userId: string;
  status: string;
  suiteName: string | null;
  totalCases: number;
  passedCases: number;
  failedCases: number;
}
