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
