// src/main.ts

import { NestFactory, Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { globalValidationPipe } from './common/pipes/validation.pipe';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const reflector = app.get(Reflector);

  app.enableCors({
    origin: configService.get<string>('FRONTEND_URL'),
    credentials: true,
  });

  app.useGlobalPipes(globalValidationPipe);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalGuards(new JwtAuthGuard(reflector));

  const port = configService.get<number>('PORT') ?? 3000;
  await app.listen(port);
  console.log(`TestPilot backend running on port ${port}`);
}

bootstrap();
