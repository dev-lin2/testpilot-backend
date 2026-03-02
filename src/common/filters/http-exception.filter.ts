// src/common/filters/http-exception.filter.ts

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

interface ValidationError {
  field: string;
  message: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: ValidationError[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const res = exceptionResponse as Record<string, unknown>;
        message = (res['message'] as string) || message;

        if (Array.isArray(res['message'])) {
          errors = (res['message'] as string[]).map((msg) => {
            const parts = msg.split(' ');
            return { field: parts[0], message: msg };
          });
          message = 'Validation failed';
        }
      }
    }

    response.status(status).json({
      success: false,
      data: null,
      message,
      ...(errors ? { errors } : {}),
    });
  }
}
