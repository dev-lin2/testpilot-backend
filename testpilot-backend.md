# TestPilot Backend — NestJS Specification

> Feed this file to Claude Code **one section at a time** to avoid hitting token limits.
> Suggested order: Setup → Auth → Users → LLM Configs → Test Suites → Test Cases → Test Runs → Playwright → Notifications → Scheduler

---

## CLAUDE.md Content

> When starting the project, create this file at `CLAUDE.md`

```markdown
# Claude Code Instructions — TestPilot Backend

## Stack
- NestJS with TypeScript (strict mode)
- Prisma ORM with PostgreSQL
- JWT Auth via @nestjs/passport (local + jwt strategy)
- Docker Compose for local dev

## Rules
- Never use `any` type — always type everything explicitly
- One module per feature, strictly modular structure
- Always use DTOs with class-validator and class-transformer
- All routes are JWT-guarded except /auth/register and /auth/login
- Use NestJS HttpException for all error handling
- Use Prisma Client for all DB operations — never raw SQL
- Use bcrypt for password hashing
- Encrypt LLM API keys at rest using AES-256
- Use @nestjs/config for all env access — never process.env directly
- Use @nestjs/bull for queue jobs (test runs)
- Use Server-Sent Events (SSE) for live test run progress
- Follow RESTful conventions strictly
- All responses must follow the standard response shape:
  { success: boolean, data: T, message?: string, meta?: object }
- Soft delete pattern: use deletedAt field, never hard delete
- Always generate complete files — no stubs, no TODOs
- Follow this spec exactly — do not add unrequested features
```

---

## Project Structure

```
testpilot-backend/
├── src/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.module.ts
│   │   ├── strategies/
│   │   │   ├── local.strategy.ts
│   │   │   └── jwt.strategy.ts
│   │   ├── guards/
│   │   │   ├── local-auth.guard.ts
│   │   │   └── jwt-auth.guard.ts
│   │   └── dto/
│   │       ├── register.dto.ts
│   │       ├── login.dto.ts
│   │       └── refresh-token.dto.ts
│   ├── users/
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── users.module.ts
│   │   └── dto/
│   │       ├── update-profile.dto.ts
│   │       └── change-password.dto.ts
│   ├── llm-configs/
│   │   ├── llm-configs.controller.ts
│   │   ├── llm-configs.service.ts
│   │   ├── llm-configs.module.ts
│   │   └── dto/
│   │       ├── create-llm-config.dto.ts
│   │       └── update-llm-config.dto.ts
│   ├── test-suites/
│   │   ├── test-suites.controller.ts
│   │   ├── test-suites.service.ts
│   │   ├── test-suites.module.ts
│   │   └── dto/
│   │       ├── create-test-suite.dto.ts
│   │       └── update-test-suite.dto.ts
│   ├── test-cases/
│   │   ├── test-cases.controller.ts
│   │   ├── test-cases.service.ts
│   │   ├── test-cases.module.ts
│   │   └── dto/
│   │       ├── create-test-case.dto.ts
│   │       └── update-test-case.dto.ts
│   ├── test-runs/
│   │   ├── test-runs.controller.ts
│   │   ├── test-runs.service.ts
│   │   ├── test-runs.module.ts
│   │   ├── test-runs.processor.ts   ← Bull queue processor
│   │   └── dto/
│   │       └── create-test-run.dto.ts
│   ├── test-results/
│   │   ├── test-results.controller.ts
│   │   ├── test-results.service.ts
│   │   └── test-results.module.ts
│   ├── playwright/
│   │   ├── playwright.service.ts
│   │   └── playwright.module.ts
│   ├── scheduler/
│   │   ├── scheduler.service.ts
│   │   └── scheduler.module.ts
│   ├── notifications/
│   │   ├── notifications.service.ts
│   │   └── notifications.module.ts
│   ├── audit/
│   │   ├── audit.service.ts
│   │   ├── audit.module.ts
│   │   └── audit.interceptor.ts
│   ├── common/
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   └── public.decorator.ts
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   ├── interceptors/
│   │   │   └── response.interceptor.ts
│   │   ├── pipes/
│   │   │   └── validation.pipe.ts
│   │   ├── guards/
│   │   │   └── jwt-auth.guard.ts
│   │   └── types/
│   │       ├── response.type.ts
│   │       └── step.type.ts
│   ├── prisma/
│   │   ├── prisma.service.ts
│   │   └── prisma.module.ts
│   └── main.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── docker-compose.yml
├── .env
├── .env.example
├── CLAUDE.md
├── nest-cli.json
├── tsconfig.json
└── package.json
```

---

## Environment Variables

### `.env` / `.env.example`

```env
# App
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Database
DATABASE_URL=postgresql://testpilot:testpilot@localhost:5432/testpilot

# JWT
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Encryption (for LLM API keys)
ENCRYPTION_KEY=32_char_hex_string_here

# Redis (Bull queues)
REDIS_HOST=localhost
REDIS_PORT=6379

# Email (for notifications)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_pass
SMTP_FROM=noreply@testpilot.dev

# Playwright
PLAYWRIGHT_SCREENSHOTS_DIR=./storage/screenshots
PLAYWRIGHT_VIDEOS_DIR=./storage/videos
PLAYWRIGHT_TIMEOUT=30000
```

---

## Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: testpilot_postgres
    environment:
      POSTGRES_USER: testpilot
      POSTGRES_PASSWORD: testpilot
      POSTGRES_DB: testpilot
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - testpilot_network

  redis:
    image: redis:7-alpine
    container_name: testpilot_redis
    ports:
      - '6379:6379'
    networks:
      - testpilot_network

  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: testpilot_pgadmin
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@testpilot.dev
      PGADMIN_DEFAULT_PASSWORD: admin
    ports:
      - '5050:80'
    depends_on:
      - postgres
    networks:
      - testpilot_network

volumes:
  postgres_data:

networks:
  testpilot_network:
    driver: bridge
```

---

## Package List

```json
{
  "dependencies": {
    "@nestjs/common": "^11.0.0",
    "@nestjs/core": "^11.0.0",
    "@nestjs/platform-express": "^11.0.0",
    "@nestjs/config": "^3.0.0",
    "@nestjs/passport": "^11.0.0",
    "@nestjs/jwt": "^11.0.0",
    "@nestjs/bull": "^11.0.0",
    "@nestjs/schedule": "^4.0.0",
    "@nestjs/event-emitter": "^2.0.0",
    "@nestjs/serve-static": "^4.0.0",
    "@prisma/client": "^6.0.0",
    "passport": "^0.7.0",
    "passport-local": "^1.0.0",
    "passport-jwt": "^4.0.0",
    "bcrypt": "^5.1.0",
    "bull": "^4.12.0",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.0",
    "nodemailer": "^6.9.0",
    "playwright": "^1.45.0",
    "cron": "^3.1.0",
    "axios": "^1.7.0",
    "rxjs": "^7.8.0",
    "reflect-metadata": "^0.2.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^11.0.0",
    "@nestjs/testing": "^11.0.0",
    "@types/bcrypt": "^5.0.0",
    "@types/node": "^22.0.0",
    "@types/nodemailer": "^6.4.0",
    "@types/passport-jwt": "^4.0.0",
    "@types/passport-local": "^1.0.0",
    "prisma": "^6.0.0",
    "ts-node": "^10.9.0",
    "typescript": "^5.5.0"
  }
}
```

---

## Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  ADMIN
  USER
}

enum LLMProvider {
  OPENAI
  ANTHROPIC
  GEMINI
  OLLAMA
  CUSTOM
}

enum TestRunStatus {
  PENDING
  RUNNING
  PASSED
  FAILED
  PARTIAL
  CANCELLED
  ERROR
}

enum TestResultStatus {
  PASSED
  FAILED
  SKIPPED
  ERROR
}

enum StepAction {
  GOTO
  CLICK
  FILL
  SELECT
  WAIT
  WAIT_FOR_SELECTOR
  EXPECT
  SCREENSHOT
  HOVER
  PRESS_KEY
  SCROLL
}

enum AssertionType {
  VISIBLE
  HIDDEN
  CONTAINS_TEXT
  EQUALS_TEXT
  URL_CONTAINS
  URL_EQUALS
  COUNT
  ATTRIBUTE_EQUALS
  CHECKED
  ENABLED
  DISABLED
}

enum NotificationEvent {
  RUN_STARTED
  RUN_PASSED
  RUN_FAILED
  RUN_PARTIAL
}

enum AuditAction {
  CREATE
  UPDATE
  DELETE
  RUN
  LOGIN
  LOGOUT
}

model User {
  id           String    @id @default(cuid())
  name         String
  email        String    @unique
  password     String
  role         UserRole  @default(USER)
  refreshToken String?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  deletedAt    DateTime?

  llmConfigs   LLMConfig[]
  testSuites   TestSuite[]
  testRuns     TestRun[]
  apiKeys      ApiKey[]
  auditLogs    AuditLog[]
  notifications NotificationConfig[]

  @@map("users")
}

model ApiKey {
  id        String    @id @default(cuid())
  userId    String
  name      String
  key       String    @unique
  lastUsed  DateTime?
  createdAt DateTime  @default(now())
  deletedAt DateTime?

  user User @relation(fields: [userId], references: [id])

  @@map("api_keys")
}

model LLMConfig {
  id           String      @id @default(cuid())
  userId       String
  name         String
  provider     LLMProvider
  model        String
  apiKeyEnc    String      // AES-256 encrypted
  baseUrl      String?     // for OLLAMA or CUSTOM
  temperature  Float       @default(0.2)
  maxTokens    Int         @default(2048)
  tokenBudget  Int?        // max tokens allowed per run
  totalTokens  Int         @default(0) // cumulative usage
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
  deletedAt    DateTime?

  user        User         @relation(fields: [userId], references: [id])
  testCases   TestCase[]
  testResults TestResult[]

  @@map("llm_configs")
}

model Environment {
  id        String    @id @default(cuid())
  userId    String
  name      String    // e.g. "Local", "Staging", "Production"
  baseUrl   String
  variables Json      @default("{}") // key-value pairs
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  testRuns  TestRun[]

  @@map("environments")
}

model TestSuite {
  id           String    @id @default(cuid())
  userId       String
  name         String
  description  String?
  tags         String[]
  stopOnFail   Boolean   @default(false)
  dependsOnId  String?   // suite dependency
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  deletedAt    DateTime?

  user       User        @relation(fields: [userId], references: [id])
  dependsOn  TestSuite?  @relation("SuiteDependency", fields: [dependsOnId], references: [id])
  dependents TestSuite[] @relation("SuiteDependency")
  testCases  TestCase[]
  testRuns   TestRun[]
  schedules  Schedule[]

  @@map("test_suites")
}

model TestCase {
  id            String    @id @default(cuid())
  suiteId       String
  llmConfigId   String?
  name          String
  description   String?
  tags          String[]
  steps         Json      // Step[] — see Step type below
  variables     Json      @default("{}") // local variable overrides
  order         Int       @default(0)
  captureScreenshots Boolean @default(true)
  captureVideo  Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime?

  suite       TestSuite    @relation(fields: [suiteId], references: [id])
  llmConfig   LLMConfig?   @relation(fields: [llmConfigId], references: [id])
  testResults TestResult[]

  @@map("test_cases")
}

model TestRun {
  id              String        @id @default(cuid())
  userId          String
  suiteId         String?
  testCaseId      String?       // null if running full suite
  environmentId   String?
  status          TestRunStatus @default(PENDING)
  failedOnly      Boolean       @default(false) // re-run failed only
  totalCases      Int           @default(0)
  passedCases     Int           @default(0)
  failedCases     Int           @default(0)
  skippedCases    Int           @default(0)
  totalPromptTokens     Int     @default(0)
  totalCompletionTokens Int     @default(0)
  totalTokensUsed       Int     @default(0)
  estimatedCost         Float   @default(0)
  startedAt       DateTime?
  finishedAt      DateTime?
  createdAt       DateTime      @default(now())

  user        User          @relation(fields: [userId], references: [id])
  suite       TestSuite?    @relation(fields: [suiteId], references: [id])
  environment Environment?  @relation(fields: [environmentId], references: [id])
  results     TestResult[]

  @@map("test_runs")
}

model TestResult {
  id               String           @id @default(cuid())
  runId            String
  testCaseId       String
  llmConfigId      String?
  status           TestResultStatus
  reason           String?          // human-readable failure reason
  errorDetail      String?          // technical error message
  failedStepIndex  Int?             // which step failed (0-indexed)
  failedStepAction String?          // action name of failed step
  screenshots      Json             @default("[]") // string[] — file paths
  videoUrl         String?
  logs             Json             @default("[]") // StepLog[]
  promptTokens     Int              @default(0)
  completionTokens Int              @default(0)
  totalTokens      Int              @default(0)
  estimatedCost    Float            @default(0)
  duration         Int              @default(0) // ms
  createdAt        DateTime         @default(now())

  run       TestRun    @relation(fields: [runId], references: [id])
  testCase  TestCase   @relation(fields: [testCaseId], references: [id])
  llmConfig LLMConfig? @relation(fields: [llmConfigId], references: [id])

  @@map("test_results")
}

model Schedule {
  id          String    @id @default(cuid())
  suiteId     String
  cronExpr    String    // e.g. "0 2 * * *"
  timezone    String    @default("UTC")
  enabled     Boolean   @default(true)
  lastRunAt   DateTime?
  nextRunAt   DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  suite TestSuite @relation(fields: [suiteId], references: [id])

  @@map("schedules")
}

model NotificationConfig {
  id        String              @id @default(cuid())
  userId    String
  type      String              // "email" | "webhook"
  target    String              // email address or webhook URL
  events    NotificationEvent[]
  enabled   Boolean             @default(true)
  createdAt DateTime            @default(now())
  updatedAt DateTime            @updatedAt

  user User @relation(fields: [userId], references: [id])

  @@map("notification_configs")
}

model AuditLog {
  id         String      @id @default(cuid())
  userId     String
  action     AuditAction
  resource   String      // e.g. "TestSuite", "TestRun"
  resourceId String
  metadata   Json        @default("{}")
  createdAt  DateTime    @default(now())

  user User @relation(fields: [userId], references: [id])

  @@map("audit_logs")
}
```

---

## TypeScript Types (Shared)

```typescript
// src/common/types/step.type.ts

export type StepAction =
  | 'goto' | 'click' | 'fill' | 'select'
  | 'wait' | 'wait_for_selector' | 'expect'
  | 'screenshot' | 'hover' | 'press_key' | 'scroll';

export type AssertionType =
  | 'visible' | 'hidden' | 'contains_text' | 'equals_text'
  | 'url_contains' | 'url_equals' | 'count'
  | 'attribute_equals' | 'checked' | 'enabled' | 'disabled';

export interface TestStep {
  id: string;           // uuid per step for tracking
  action: StepAction;
  selector?: string;    // CSS or text selector
  value?: string;       // fill value, goto URL, key name
  assertion?: AssertionType;
  assertionValue?: string; // expected value for assertion
  attribute?: string;   // for attribute_equals assertion
  timeout?: number;     // ms override for this step
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

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

---

## API Endpoints — Full Specification

### Standard Response Shape
All endpoints return:
```json
{
  "success": true,
  "data": {},
  "message": "optional message",
  "meta": { "total": 0, "page": 1, "limit": 20, "totalPages": 1 }
}
```

---

### AUTH MODULE — `/auth`

#### `POST /auth/register`
**Public route**
```json
// Request
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Password123!"
}

// Response 201
{
  "success": true,
  "data": {
    "user": { "id": "...", "name": "John Doe", "email": "john@example.com", "role": "USER" },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

#### `POST /auth/login`
**Public route**
```json
// Request
{
  "email": "john@example.com",
  "password": "Password123!"
}

// Response 200
{
  "success": true,
  "data": {
    "user": { "id": "...", "name": "John Doe", "email": "john@example.com", "role": "USER" },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

#### `POST /auth/logout`
**JWT Required** — Header: `Authorization: Bearer <token>`
```json
// Response 200
{ "success": true, "data": null, "message": "Logged out successfully" }
```

#### `POST /auth/refresh`
**Public route**
```json
// Request
{ "refreshToken": "eyJ..." }

// Response 200
{
  "success": true,
  "data": { "accessToken": "eyJ...", "refreshToken": "eyJ..." }
}
```

#### `GET /auth/me`
**JWT Required**
```json
// Response 200
{
  "success": true,
  "data": {
    "id": "...", "name": "John Doe", "email": "john@example.com",
    "role": "USER", "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### USERS MODULE — `/users`

#### `GET /users/profile`
**JWT Required**
```json
// Response 200
{
  "success": true,
  "data": { "id": "...", "name": "John Doe", "email": "john@example.com", "createdAt": "..." }
}
```

#### `PATCH /users/profile`
**JWT Required**
```json
// Request
{ "name": "John Updated" }

// Response 200
{ "success": true, "data": { "id": "...", "name": "John Updated", "email": "..." } }
```

#### `PATCH /users/change-password`
**JWT Required**
```json
// Request
{ "currentPassword": "OldPass123!", "newPassword": "NewPass456!" }

// Response 200
{ "success": true, "data": null, "message": "Password changed successfully" }
```

#### `GET /users/api-keys`
**JWT Required**
```json
// Response 200
{
  "success": true,
  "data": [
    { "id": "...", "name": "CI Key", "key": "tp_****xyz", "lastUsed": null, "createdAt": "..." }
  ]
}
```

#### `POST /users/api-keys`
**JWT Required**
```json
// Request
{ "name": "CI Key" }

// Response 201
{
  "success": true,
  "data": { "id": "...", "name": "CI Key", "key": "tp_fullkeyshownonce", "createdAt": "..." },
  "message": "Save this key — it will not be shown again"
}
```

#### `DELETE /users/api-keys/:id`
**JWT Required**
```json
// Response 200
{ "success": true, "data": null, "message": "API key deleted" }
```

---

### LLM CONFIGS MODULE — `/llm-configs`

#### `GET /llm-configs`
**JWT Required**
```json
// Response 200
{
  "success": true,
  "data": [
    {
      "id": "...", "name": "My Claude", "provider": "ANTHROPIC",
      "model": "claude-sonnet-4-20250514", "baseUrl": null,
      "temperature": 0.2, "maxTokens": 2048, "tokenBudget": 10000,
      "totalTokens": 4523, "createdAt": "..."
    }
  ]
}
```

#### `POST /llm-configs`
**JWT Required**
```json
// Request
{
  "name": "My Claude",
  "provider": "ANTHROPIC",
  "model": "claude-sonnet-4-20250514",
  "apiKey": "sk-ant-...",       // stored encrypted
  "baseUrl": null,
  "temperature": 0.2,
  "maxTokens": 2048,
  "tokenBudget": 10000
}

// Response 201
{ "success": true, "data": { "id": "...", "name": "My Claude", "provider": "ANTHROPIC", ... } }
```

#### `GET /llm-configs/:id`
**JWT Required**
```json
// Response 200
{ "success": true, "data": { "id": "...", "name": "...", "provider": "...", ... } }
```

#### `PATCH /llm-configs/:id`
**JWT Required**
```json
// Request (all fields optional)
{ "name": "Updated Name", "temperature": 0.5, "tokenBudget": 5000 }

// Response 200
{ "success": true, "data": { ...updatedConfig } }
```

#### `DELETE /llm-configs/:id`
**JWT Required** — Soft delete
```json
// Response 200
{ "success": true, "data": null, "message": "LLM config deleted" }
```

---

### ENVIRONMENTS MODULE — `/environments`

#### `GET /environments`
**JWT Required**
```json
// Response 200
{
  "success": true,
  "data": [
    { "id": "...", "name": "Local", "baseUrl": "http://localhost:3001", "variables": { "USER": "admin" } }
  ]
}
```

#### `POST /environments`
**JWT Required**
```json
// Request
{
  "name": "Staging",
  "baseUrl": "https://staging.myapp.com",
  "variables": { "USER": "testuser", "TIMEOUT": "5000" }
}

// Response 201
{ "success": true, "data": { "id": "...", "name": "Staging", ... } }
```

#### `PATCH /environments/:id`
**JWT Required**
```json
// Request
{ "name": "Staging Updated", "baseUrl": "https://new-staging.myapp.com" }

// Response 200
{ "success": true, "data": { ...updatedEnv } }
```

#### `DELETE /environments/:id`
**JWT Required** — Soft delete
```json
// Response 200
{ "success": true, "data": null, "message": "Environment deleted" }
```

---

### TEST SUITES MODULE — `/test-suites`

#### `GET /test-suites`
**JWT Required** — Query params: `?page=1&limit=20&tags=smoke,regression&search=login&archived=false`
```json
// Response 200
{
  "success": true,
  "data": [
    {
      "id": "...", "name": "Auth Suite", "description": "...",
      "tags": ["smoke", "auth"], "stopOnFail": true,
      "dependsOnId": null, "caseCount": 5,
      "lastRunStatus": "PASSED", "lastRunAt": "...",
      "createdAt": "..."
    }
  ],
  "meta": { "total": 12, "page": 1, "limit": 20, "totalPages": 1 }
}
```

#### `POST /test-suites`
**JWT Required**
```json
// Request
{
  "name": "Auth Suite",
  "description": "Tests authentication flows",
  "tags": ["smoke", "auth"],
  "stopOnFail": true,
  "dependsOnId": null
}

// Response 201
{ "success": true, "data": { "id": "...", "name": "Auth Suite", ... } }
```

#### `GET /test-suites/:id`
**JWT Required**
```json
// Response 200
{
  "success": true,
  "data": {
    "id": "...", "name": "Auth Suite", "description": "...",
    "tags": ["smoke"], "stopOnFail": true, "dependsOnId": null,
    "testCases": [ { "id": "...", "name": "Login Test", "order": 0, "status": "PASSED" } ],
    "schedules": [ { "id": "...", "cronExpr": "0 2 * * *", "enabled": true } ],
    "createdAt": "..."
  }
}
```

#### `PATCH /test-suites/:id`
**JWT Required**
```json
// Request (all fields optional)
{ "name": "Updated Name", "tags": ["regression"], "stopOnFail": false }

// Response 200
{ "success": true, "data": { ...updatedSuite } }
```

#### `DELETE /test-suites/:id`
**JWT Required** — Soft delete
```json
// Response 200
{ "success": true, "data": null, "message": "Test suite archived" }
```

#### `POST /test-suites/:id/run`
**JWT Required** — Trigger full suite run
```json
// Request
{
  "environmentId": "env_id_here",
  "failedOnly": false
}

// Response 202
{
  "success": true,
  "data": { "runId": "run_...", "status": "PENDING" },
  "message": "Test run queued"
}
```

#### `POST /test-suites/:id/duplicate`
**JWT Required**
```json
// Response 201
{ "success": true, "data": { "id": "new_suite_id", "name": "Auth Suite (Copy)", ... } }
```

---

### TEST CASES MODULE — `/test-cases`

#### `GET /test-suites/:suiteId/test-cases`
**JWT Required** — Query params: `?tags=smoke&search=login`
```json
// Response 200
{
  "success": true,
  "data": [
    {
      "id": "...", "name": "Login Test", "description": "...",
      "tags": ["auth"], "order": 0,
      "steps": [...],
      "llmConfigId": "...",
      "captureScreenshots": true,
      "captureVideo": false,
      "lastResultStatus": "PASSED",
      "createdAt": "..."
    }
  ]
}
```

#### `POST /test-cases`
**JWT Required**
```json
// Request
{
  "suiteId": "suite_id_here",
  "name": "Login Test",
  "description": "Tests user login",
  "tags": ["auth", "smoke"],
  "llmConfigId": "llm_id_here",
  "captureScreenshots": true,
  "captureVideo": false,
  "variables": { "EMAIL": "test@test.com" },
  "steps": [
    {
      "id": "step-uuid-1",
      "action": "goto",
      "value": "{{baseUrl}}/login",
      "description": "Navigate to login page"
    },
    {
      "id": "step-uuid-2",
      "action": "fill",
      "selector": "#email",
      "value": "{{EMAIL}}",
      "description": "Fill email"
    },
    {
      "id": "step-uuid-3",
      "action": "fill",
      "selector": "#password",
      "value": "secret123",
      "description": "Fill password"
    },
    {
      "id": "step-uuid-4",
      "action": "click",
      "selector": "button[type=submit]",
      "description": "Click login"
    },
    {
      "id": "step-uuid-5",
      "action": "expect",
      "selector": ".dashboard",
      "assertion": "visible",
      "description": "Dashboard should be visible"
    }
  ]
}

// Response 201
{ "success": true, "data": { "id": "...", "name": "Login Test", ... } }
```

#### `GET /test-cases/:id`
**JWT Required**
```json
// Response 200
{ "success": true, "data": { "id": "...", "name": "...", "steps": [...], ... } }
```

#### `PATCH /test-cases/:id`
**JWT Required**
```json
// Request (all fields optional)
{ "name": "Updated", "steps": [...], "tags": ["regression"] }

// Response 200
{ "success": true, "data": { ...updatedCase } }
```

#### `DELETE /test-cases/:id`
**JWT Required** — Soft delete
```json
// Response 200
{ "success": true, "data": null, "message": "Test case archived" }
```

#### `POST /test-cases/:id/run`
**JWT Required** — Run single test case
```json
// Request
{ "environmentId": "env_id_here" }

// Response 202
{
  "success": true,
  "data": { "runId": "run_...", "status": "PENDING" },
  "message": "Test run queued"
}
```

#### `POST /test-cases/:id/duplicate`
**JWT Required**
```json
// Response 201
{ "success": true, "data": { "id": "new_case_id", "name": "Login Test (Copy)", ... } }
```

#### `PATCH /test-cases/reorder`
**JWT Required** — Reorder test cases within suite
```json
// Request
{
  "suiteId": "suite_id",
  "orders": [
    { "id": "case_id_1", "order": 0 },
    { "id": "case_id_2", "order": 1 },
    { "id": "case_id_3", "order": 2 }
  ]
}

// Response 200
{ "success": true, "data": null, "message": "Order updated" }
```

#### `POST /test-cases/generate`
**JWT Required** — AI-assisted test case generation
```json
// Request
{
  "suiteId": "suite_id",
  "llmConfigId": "llm_id",
  "description": "Test that a user can login with valid credentials and see the dashboard",
  "baseUrl": "https://myapp.com"
}

// Response 200
{
  "success": true,
  "data": {
    "name": "User Login Flow",
    "steps": [...generated steps...],
    "tokensUsed": { "prompt": 320, "completion": 180, "total": 500 }
  }
}
```

#### `POST /test-cases/:id/validate-selectors`
**JWT Required** — Validate all selectors in a test case exist on page
```json
// Request
{ "environmentId": "env_id" }

// Response 200
{
  "success": true,
  "data": {
    "valid": false,
    "results": [
      { "stepId": "step-uuid-2", "selector": "#email", "found": true },
      { "stepId": "step-uuid-3", "selector": "#password", "found": true },
      { "stepId": "step-uuid-5", "selector": ".dashbord", "found": false, "suggestion": ".dashboard" }
    ]
  }
}
```

#### `POST /test-cases/suggest-coverage`
**JWT Required** — AI suggests missing test cases for a suite
```json
// Request
{ "suiteId": "suite_id", "llmConfigId": "llm_id" }

// Response 200
{
  "success": true,
  "data": {
    "suggestions": [
      { "name": "Login with wrong password", "description": "...", "priority": "high" },
      { "name": "Login with empty fields", "description": "...", "priority": "medium" }
    ],
    "tokensUsed": { "prompt": 400, "completion": 250, "total": 650 }
  }
}
```

---

### TEST RUNS MODULE — `/test-runs`

#### `GET /test-runs`
**JWT Required** — Query params: `?page=1&limit=20&suiteId=...&status=FAILED`
```json
// Response 200
{
  "success": true,
  "data": [
    {
      "id": "...", "suiteId": "...", "suiteName": "Auth Suite",
      "status": "FAILED", "totalCases": 5, "passedCases": 3,
      "failedCases": 2, "skippedCases": 0,
      "totalTokensUsed": 1240, "estimatedCost": 0.0024,
      "startedAt": "...", "finishedAt": "...",
      "duration": 12400
    }
  ],
  "meta": { "total": 48, "page": 1, "limit": 20, "totalPages": 3 }
}
```

#### `GET /test-runs/:id`
**JWT Required**
```json
// Response 200
{
  "success": true,
  "data": {
    "id": "...", "suiteId": "...", "status": "FAILED",
    "totalCases": 5, "passedCases": 3, "failedCases": 2, "skippedCases": 0,
    "totalPromptTokens": 800, "totalCompletionTokens": 440,
    "totalTokensUsed": 1240, "estimatedCost": 0.0024,
    "startedAt": "...", "finishedAt": "...",
    "environment": { "id": "...", "name": "Staging" },
    "results": [
      {
        "id": "...", "testCaseId": "...", "testCaseName": "Login Test",
        "status": "PASSED", "duration": 2400,
        "totalTokens": 320, "estimatedCost": 0.0006
      },
      {
        "id": "...", "testCaseId": "...", "testCaseName": "Checkout Test",
        "status": "FAILED",
        "reason": "Element not found",
        "failedStepIndex": 3,
        "failedStepAction": "click",
        "duration": 5100,
        "totalTokens": 920, "estimatedCost": 0.0018
      }
    ]
  }
}
```

#### `POST /test-runs/:id/cancel`
**JWT Required**
```json
// Response 200
{ "success": true, "data": null, "message": "Test run cancelled" }
```

#### `GET /test-runs/:id/compare/:otherId`
**JWT Required** — Compare two runs
```json
// Response 200
{
  "success": true,
  "data": {
    "runA": { "id": "...", "status": "PASSED", "passedCases": 5, "failedCases": 0 },
    "runB": { "id": "...", "status": "FAILED", "passedCases": 3, "failedCases": 2 },
    "diff": [
      { "testCaseId": "...", "name": "Checkout Test", "runAStatus": "PASSED", "runBStatus": "FAILED" }
    ]
  }
}
```

#### `GET /test-runs/:id/export`
**JWT Required** — Query param: `?format=json|pdf`
Returns file download.

#### `GET /test-runs/stats`
**JWT Required** — Query params: `?suiteId=...&from=2024-01-01&to=2024-12-31`
```json
// Response 200
{
  "success": true,
  "data": {
    "totalRuns": 48,
    "passRate": 72.5,
    "totalTokensUsed": 58420,
    "totalEstimatedCost": 0.114,
    "trend": [
      { "date": "2024-01-01", "passed": 4, "failed": 1, "tokens": 1200 }
    ],
    "failureGroups": [
      { "reason": "Element not found", "count": 8 },
      { "reason": "Timeout", "count": 3 }
    ]
  }
}
```

---

### TEST RESULTS MODULE — `/test-results`

#### `GET /test-results/:id`
**JWT Required**
```json
// Response 200
{
  "success": true,
  "data": {
    "id": "...", "runId": "...", "testCaseId": "...", "testCaseName": "...",
    "status": "FAILED",
    "reason": "Assertion failed: element not visible",
    "errorDetail": "TimeoutError: locator('.dashboard') exceeded 5000ms",
    "failedStepIndex": 4,
    "failedStepAction": "expect",
    "screenshots": [
      "/storage/screenshots/run_x/step_0.png",
      "/storage/screenshots/run_x/step_1.png",
      "/storage/screenshots/run_x/failure.png"
    ],
    "videoUrl": "/storage/videos/run_x/result_y.webm",
    "logs": [
      {
        "stepId": "step-uuid-1", "stepIndex": 0, "action": "goto",
        "description": "Navigate to login page", "status": "passed",
        "duration": 340, "screenshotPath": "...", "timestamp": "..."
      },
      {
        "stepId": "step-uuid-5", "stepIndex": 4, "action": "expect",
        "description": "Dashboard should be visible", "status": "failed",
        "reason": "Element .dashboard not visible after 5000ms",
        "duration": 5100, "screenshotPath": "...", "timestamp": "..."
      }
    ],
    "promptTokens": 640, "completionTokens": 280,
    "totalTokens": 920, "estimatedCost": 0.0018,
    "duration": 7840,
    "aiAnalysis": {
      "summary": "The dashboard failed to load after login. The selector may be correct but the redirect did not happen.",
      "suggestion": "Check if the login API returns a 200 and that the redirect logic is working. Try adding a wait step after click.",
      "autoHealSuggestion": { "stepIndex": 3, "newSelector": "#dashboard-container" }
    }
  }
}
```

#### `POST /test-results/:id/analyze`
**JWT Required** — Trigger AI failure analysis
```json
// Request
{ "llmConfigId": "llm_id" }

// Response 200
{
  "success": true,
  "data": {
    "summary": "...",
    "suggestion": "...",
    "autoHealSuggestion": { "stepIndex": 3, "newSelector": "#dashboard-container" },
    "tokensUsed": { "prompt": 480, "completion": 220, "total": 700 }
  }
}
```

---

### SSE — Live Test Run Progress

#### `GET /test-runs/:id/stream`
**JWT Required (via query param token)** — Server-Sent Events
```
URL: GET /test-runs/:id/stream?token=<accessToken>
Content-Type: text/event-stream

Events emitted:
  event: step_update
  data: { "stepIndex": 2, "stepId": "...", "status": "passed", "duration": 340, "screenshotPath": "..." }

  event: case_update
  data: { "testCaseId": "...", "testCaseName": "Login Test", "status": "PASSED", "totalTokens": 320 }

  event: run_complete
  data: { "runId": "...", "status": "PASSED", "totalTokens": 1240, "estimatedCost": 0.0024 }

  event: error
  data: { "message": "Playwright crashed" }
```

---

### SCHEDULES MODULE — `/schedules`

#### `GET /schedules`
**JWT Required**
```json
// Response 200
{
  "success": true,
  "data": [
    { "id": "...", "suiteId": "...", "suiteName": "Auth Suite", "cronExpr": "0 2 * * *", "enabled": true, "nextRunAt": "..." }
  ]
}
```

#### `POST /schedules`
**JWT Required**
```json
// Request
{ "suiteId": "suite_id", "cronExpr": "0 2 * * *", "timezone": "Asia/Singapore", "enabled": true }

// Response 201
{ "success": true, "data": { "id": "...", ... } }
```

#### `PATCH /schedules/:id`
**JWT Required**
```json
// Request
{ "cronExpr": "0 6 * * *", "enabled": false }

// Response 200
{ "success": true, "data": { ...updatedSchedule } }
```

#### `DELETE /schedules/:id`
**JWT Required**
```json
// Response 200
{ "success": true, "data": null, "message": "Schedule deleted" }
```

---

### NOTIFICATIONS MODULE — `/notifications`

#### `GET /notifications/configs`
**JWT Required**
```json
// Response 200
{
  "success": true,
  "data": [
    {
      "id": "...", "type": "email", "target": "john@example.com",
      "events": ["RUN_FAILED", "RUN_PARTIAL"], "enabled": true
    },
    {
      "id": "...", "type": "webhook", "target": "https://hooks.slack.com/...",
      "events": ["RUN_FAILED"], "enabled": true
    }
  ]
}
```

#### `POST /notifications/configs`
**JWT Required**
```json
// Request
{
  "type": "webhook",
  "target": "https://hooks.slack.com/services/...",
  "events": ["RUN_FAILED", "RUN_PARTIAL"],
  "enabled": true
}

// Response 201
{ "success": true, "data": { "id": "...", ... } }
```

#### `PATCH /notifications/configs/:id`
**JWT Required**
```json
// Request
{ "enabled": false }

// Response 200
{ "success": true, "data": { ...updated } }
```

#### `DELETE /notifications/configs/:id`
**JWT Required**
```json
// Response 200
{ "success": true, "data": null, "message": "Notification config deleted" }
```

---

### AUDIT MODULE — `/audit`

#### `GET /audit`
**JWT Required** — Query params: `?page=1&limit=20&action=RUN&resource=TestSuite`
```json
// Response 200
{
  "success": true,
  "data": [
    {
      "id": "...", "action": "RUN", "resource": "TestSuite",
      "resourceId": "...", "metadata": { "status": "PASSED" },
      "createdAt": "..."
    }
  ],
  "meta": { "total": 200, "page": 1, "limit": 20, "totalPages": 10 }
}
```

---

## Module Implementation Notes

### Auth Module
- Use `@nestjs/passport` with local strategy (email+password) and JWT strategy
- On login: generate access token (15m) + refresh token (7d), store hashed refresh token in DB
- On refresh: verify refresh token, rotate both tokens
- On logout: clear refresh token from DB
- Use `@Public()` decorator to mark routes that skip JWT guard

### Playwright Service
- Use `playwright` npm package directly (not Playwright Test)
- Launch browser in headless mode
- Execute steps sequentially, capture screenshot after each step if enabled
- On failure: capture screenshot, stop execution, return structured error
- Variable substitution: replace `{{VAR_NAME}}` in values/selectors with environment + test case variables
- Emit progress events via EventEmitter for SSE streaming
- Record video using Playwright's built-in video recording if enabled

### AI Integration (LLM Configs)
- Use `axios` to call provider APIs directly:
  - OpenAI: `https://api.openai.com/v1/chat/completions`
  - Anthropic: `https://api.anthropic.com/v1/messages`
  - Gemini: `https://generativelanguage.googleapis.com/v1beta/models`
  - Ollama: `baseUrl/api/chat`
- Decrypt API key before each call
- Track prompt + completion tokens from response
- Update `LLMConfig.totalTokens` after each call
- Respect `tokenBudget` — throw error if budget would be exceeded

### Queue Jobs (Bull)
- Queue: `test-runs`
- Job: `execute-run` with payload `{ runId: string }`
- Processor fetches run → test cases → executes each via PlaywrightService → saves results
- Emit SSE events at each step via EventEmitter

### Encryption
- Use Node.js `crypto` module with AES-256-CBC
- `ENCRYPTION_KEY` env var (32-byte hex string)
- Encrypt on save, decrypt on read for `llmConfigs.apiKeyEnc`

### Scheduler
- Use `@nestjs/schedule` with `@Cron` decorator
- Every minute: check schedules where `nextRunAt <= now` and `enabled = true`
- Dispatch test run job, update `lastRunAt` and calculate `nextRunAt`

---

## Error Response Shape

```json
{
  "success": false,
  "data": null,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "email must be a valid email" }
  ]
}
```

HTTP status codes used:
- `200` OK
- `201` Created
- `202` Accepted (async job queued)
- `400` Bad Request (validation)
- `401` Unauthorized
- `403` Forbidden
- `404` Not Found
- `409` Conflict (duplicate)
- `500` Internal Server Error
