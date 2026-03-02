// src/app.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { LlmConfigsModule } from './llm-configs/llm-configs.module';
import { EnvironmentsModule } from './environments/environments.module';
import { TestSuitesModule } from './test-suites/test-suites.module';
import { TestCasesModule } from './test-cases/test-cases.module';
import { TestRunsModule } from './test-runs/test-runs.module';
import { TestResultsModule } from './test-results/test-results.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SchedulerModule } from './scheduler/scheduler.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.getOrThrow<string>('REDIS_HOST'),
          port: configService.getOrThrow<number>('REDIS_PORT'),
        },
      }),
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    LlmConfigsModule,
    EnvironmentsModule,
    TestSuitesModule,
    TestCasesModule,
    TestRunsModule,
    TestResultsModule,
    NotificationsModule,
    SchedulerModule,
  ],
})
export class AppModule {}
