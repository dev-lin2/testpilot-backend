// src/scheduler/scheduler.types.ts

export interface ScheduleResponse {
  id: string;
  suiteId: string;
  suiteName: string;
  cronExpr: string;
  timezone: string;
  enabled: boolean;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
