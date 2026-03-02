// src/playwright/playwright.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as fs from 'fs';
import * as nodePath from 'path';
import type { Browser, BrowserContext, Page, Locator } from 'playwright';
import type { TestCase, Environment } from '@prisma/client';
import type { StepLog, TestStep } from '../common/types/step.type';

// TestResultStatus string literals (avoids runtime import of const enum)
type TRStatus = 'PASSED' | 'FAILED' | 'SKIPPED' | 'ERROR';

export interface PlaywrightRunResult {
  status: TRStatus;
  reason?: string;
  errorDetail?: string;
  failedStepIndex?: number;
  failedStepAction?: string;
  screenshots: string[];
  videoUrl?: string;
  logs: StepLog[];
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  duration: number;
}

@Injectable()
export class PlaywrightService {
  private readonly logger = new Logger(PlaywrightService.name);

  constructor(
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {}

  async executeTestCase(
    testCase: TestCase,
    environment: Environment | null,
    runId: string,
  ): Promise<PlaywrightRunResult> {
    const screenshotsBaseDir = this.configService.getOrThrow<string>(
      'PLAYWRIGHT_SCREENSHOTS_DIR',
    );
    const videosBaseDir = this.configService.getOrThrow<string>(
      'PLAYWRIGHT_VIDEOS_DIR',
    );
    const defaultTimeout = Number(
      this.configService.getOrThrow<string>('PLAYWRIGHT_TIMEOUT'),
    );

    const runScreenshotsDir = nodePath.resolve(
      screenshotsBaseDir,
      runId,
      testCase.id,
    );
    const runVideosDir = nodePath.resolve(videosBaseDir, runId);

    if (testCase.captureScreenshots) {
      fs.mkdirSync(runScreenshotsDir, { recursive: true });
    }
    if (testCase.captureVideo) {
      fs.mkdirSync(runVideosDir, { recursive: true });
    }

    // Merge variables: env vars (lower priority) → test case vars → baseUrl
    const vars: Record<string, string> = {
      ...((environment?.variables as Record<string, string> | null) ?? {}),
      ...((testCase.variables as Record<string, string> | null) ?? {}),
      ...(environment?.baseUrl ? { baseUrl: environment.baseUrl } : {}),
    };

    const steps = testCase.steps as unknown as TestStep[];
    const screenshots: string[] = [];
    const logs: StepLog[] = [];

    let failedStepIndex: number | undefined;
    let failedStepAction: string | undefined;
    let failureReason: string | undefined;
    let failureErrorDetail: string | undefined;
    let videoUrl: string | undefined;

    const startTime = Date.now();

    let browser: Browser | null = null;
    let context: BrowserContext | null = null;
    let page: Page | null = null;

    try {
      // Dynamic import so missing browser binaries fail at runtime, not startup
      const playwright = await import('playwright');
      browser = await playwright.chromium.launch({ headless: true });

      const contextOptions = testCase.captureVideo
        ? { recordVideo: { dir: runVideosDir } }
        : {};

      context = await browser.newContext(contextOptions);
      page = await context.newPage();
      page.setDefaultTimeout(defaultTimeout);

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const stepStart = Date.now();
        let stepStatus: StepLog['status'] = 'passed';
        let stepReason: string | undefined;
        let screenshotPath: string | undefined;

        try {
          await this.executeStep(page, step, vars, defaultTimeout);

          if (testCase.captureScreenshots) {
            const screenshotName = `step_${i}.png`;
            const fullPath = nodePath.join(runScreenshotsDir, screenshotName);
            await page.screenshot({ path: fullPath });
            screenshotPath = fullPath;
            screenshots.push(fullPath);
          }
        } catch (err: unknown) {
          stepStatus = 'failed';
          stepReason =
            err instanceof Error ? err.message : 'Unknown step error';
          failureReason = stepReason;
          failureErrorDetail =
            err instanceof Error ? (err.stack ?? err.message) : String(err);
          failedStepIndex = i;
          failedStepAction = step.action;

          // Best-effort failure screenshot
          if (testCase.captureScreenshots && page) {
            try {
              const failurePath = nodePath.join(
                runScreenshotsDir,
                `failure_step_${i}.png`,
              );
              await page.screenshot({ path: failurePath, fullPage: true });
              screenshotPath = failurePath;
              screenshots.push(failurePath);
            } catch {
              // Ignore secondary screenshot failure
            }
          }
        }

        const stepLog: StepLog = {
          stepId: step.id,
          stepIndex: i,
          action: step.action,
          description: step.description,
          status: stepStatus,
          reason: stepReason,
          duration: Date.now() - stepStart,
          screenshotPath,
          timestamp: new Date().toISOString(),
        };

        logs.push(stepLog);

        this.eventEmitter.emit(`run.${runId}.step_update`, {
          stepIndex: i,
          stepId: step.id,
          status: stepStatus,
          duration: stepLog.duration,
          screenshotPath,
        });

        if (stepStatus === 'failed') break;
      }
    } catch (err: unknown) {
      // Unexpected browser/context setup error
      const msg = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? (err.stack ?? msg) : msg;
      this.logger.error(`Browser error for testCase ${testCase.id}: ${msg}`);

      return {
        status: 'ERROR',
        reason: 'Browser error',
        errorDetail: stack,
        screenshots,
        logs,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCost: 0,
        duration: Date.now() - startTime,
      };
    } finally {
      if (context) {
        try {
          await context.close();
          // Video is finalized after context.close()
          if (testCase.captureVideo && page) {
            videoUrl = (await page.video()?.path()) ?? undefined;
          }
        } catch {
          // Ignore cleanup errors
        }
      }
      if (browser) {
        try {
          await browser.close();
        } catch {
          // Ignore cleanup errors
        }
      }
    }

    const status: TRStatus =
      failedStepIndex !== undefined ? 'FAILED' : 'PASSED';

    return {
      status,
      reason: failureReason,
      errorDetail: failureErrorDetail,
      failedStepIndex,
      failedStepAction,
      screenshots,
      videoUrl,
      logs,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      estimatedCost: 0,
      duration: Date.now() - startTime,
    };
  }

  private async executeStep(
    page: Page,
    step: TestStep,
    vars: Record<string, string>,
    defaultTimeout: number,
  ): Promise<void> {
    const selector = step.selector
      ? this.substituteVars(step.selector, vars)
      : '';
    const value = step.value ? this.substituteVars(step.value, vars) : '';
    const timeout = step.timeout ?? defaultTimeout;

    switch (step.action) {
      case 'goto':
        await page.goto(value, { timeout });
        break;

      case 'click':
        await page.locator(selector).click({ timeout });
        break;

      case 'fill':
        await page.locator(selector).fill(value, { timeout });
        break;

      case 'select':
        await page.locator(selector).selectOption(value, { timeout });
        break;

      case 'wait':
        await page.waitForTimeout(Math.max(0, parseInt(value, 10) || 1000));
        break;

      case 'wait_for_selector':
        await page.locator(selector).waitFor({ state: 'visible', timeout });
        break;

      case 'hover':
        await page.locator(selector).hover({ timeout });
        break;

      case 'press_key':
        await page.keyboard.press(value);
        break;

      case 'scroll':
        if (selector) {
          await page.locator(selector).scrollIntoViewIfNeeded({ timeout });
        } else {
          await page.mouse.wheel(0, parseInt(value, 10) || 300);
        }
        break;

      case 'screenshot':
        // Per-step screenshots are taken automatically in executeTestCase;
        // an explicit screenshot step is a no-op here.
        break;

      case 'expect':
        await this.handleAssertion(page, step, vars, timeout);
        break;
    }
  }

  private async handleAssertion(
    page: Page,
    step: TestStep,
    vars: Record<string, string>,
    timeout: number,
  ): Promise<void> {
    const assertion = step.assertion;
    if (!assertion) {
      throw new Error('Assertion step is missing the assertion type');
    }

    const selector = step.selector
      ? this.substituteVars(step.selector, vars)
      : '';
    const expected = step.assertionValue
      ? this.substituteVars(step.assertionValue, vars)
      : '';

    // URL assertions do not need an element locator
    if (assertion === 'url_contains') {
      const currentUrl = page.url();
      if (!currentUrl.includes(expected)) {
        throw new Error(
          `URL assertion failed: expected URL to contain "${expected}" but got "${currentUrl}"`,
        );
      }
      return;
    }

    if (assertion === 'url_equals') {
      const currentUrl = page.url();
      if (currentUrl !== expected) {
        throw new Error(
          `URL assertion failed: expected URL "${expected}" but got "${currentUrl}"`,
        );
      }
      return;
    }

    // All remaining assertions require a selector
    if (!selector) {
      throw new Error(
        `Assertion "${assertion}" requires a selector but none was provided`,
      );
    }

    const locator: Locator = page.locator(selector);

    switch (assertion) {
      case 'visible':
        await locator.waitFor({ state: 'visible', timeout });
        break;

      case 'hidden':
        await locator.waitFor({ state: 'hidden', timeout });
        break;

      case 'contains_text': {
        await locator.waitFor({ state: 'visible', timeout });
        const text = await locator.textContent({ timeout });
        if (!text?.includes(expected)) {
          throw new Error(
            `Text assertion failed: expected to contain "${expected}" but got "${text ?? ''}"`,
          );
        }
        break;
      }

      case 'equals_text': {
        const text = await locator.textContent({ timeout });
        if (text?.trim() !== expected) {
          throw new Error(
            `Text assertion failed: expected "${expected}" but got "${text?.trim() ?? ''}"`,
          );
        }
        break;
      }

      case 'count': {
        const count = await locator.count();
        const expectedCount = parseInt(expected, 10);
        if (isNaN(expectedCount)) {
          throw new Error(
            `Count assertion requires a numeric assertionValue, got "${expected}"`,
          );
        }
        if (count !== expectedCount) {
          throw new Error(
            `Count assertion failed: expected ${expectedCount} element(s) matching "${selector}" but found ${count}`,
          );
        }
        break;
      }

      case 'attribute_equals': {
        const attrName = step.attribute ?? '';
        if (!attrName) {
          throw new Error(
            'attribute_equals assertion requires the "attribute" field',
          );
        }
        const attrValue = await locator.getAttribute(attrName, { timeout });
        if (attrValue !== expected) {
          throw new Error(
            `Attribute assertion failed: expected [${attrName}]="${expected}" but got "${attrValue ?? ''}"`,
          );
        }
        break;
      }

      case 'checked': {
        const checked = await locator.isChecked({ timeout });
        if (!checked) {
          throw new Error(
            `Checked assertion failed: element "${selector}" is not checked`,
          );
        }
        break;
      }

      case 'enabled': {
        const enabled = await locator.isEnabled({ timeout });
        if (!enabled) {
          throw new Error(
            `Enabled assertion failed: element "${selector}" is not enabled`,
          );
        }
        break;
      }

      case 'disabled': {
        const disabled = await locator.isDisabled({ timeout });
        if (!disabled) {
          throw new Error(
            `Disabled assertion failed: element "${selector}" is not disabled`,
          );
        }
        break;
      }
    }
  }

  private substituteVars(text: string, vars: Record<string, string>): string {
    return text.replace(
      /\{\{(\w+)\}\}/g,
      (_match: string, name: string) => vars[name] ?? `{{${name}}}`,
    );
  }
}
