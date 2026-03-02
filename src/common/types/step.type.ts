// src/common/types/step.type.ts

export type StepAction =
  | 'goto'
  | 'click'
  | 'fill'
  | 'select'
  | 'wait'
  | 'wait_for_selector'
  | 'expect'
  | 'screenshot'
  | 'hover'
  | 'press_key'
  | 'scroll';

export type AssertionType =
  | 'visible'
  | 'hidden'
  | 'contains_text'
  | 'equals_text'
  | 'url_contains'
  | 'url_equals'
  | 'count'
  | 'attribute_equals'
  | 'checked'
  | 'enabled'
  | 'disabled';

export interface TestStep {
  id: string; // uuid per step for tracking
  action: StepAction;
  selector?: string; // CSS or text selector
  value?: string; // fill value, goto URL, key name
  assertion?: AssertionType;
  assertionValue?: string; // expected value for assertion
  attribute?: string; // for attribute_equals assertion
  timeout?: number; // ms override for this step
  description?: string; // human-readable step description
  variables?: string[]; // variable names used in this step (e.g. {{baseUrl}})
}

export interface StepLog {
  stepId: string;
  stepIndex: number;
  action: StepAction;
  description?: string;
  status: 'passed' | 'failed' | 'skipped' | 'error';
  reason?: string;
  duration: number; // ms
  screenshotPath?: string;
  timestamp: string; // ISO
}
