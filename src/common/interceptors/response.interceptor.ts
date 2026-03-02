// src/common/interceptors/response.interceptor.ts

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../types/response.type';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // If the handler already returns the standard shape, pass through
        if (
          data !== null &&
          typeof data === 'object' &&
          'success' in (data as object) &&
          'data' in (data as object)
        ) {
          return data as unknown as ApiResponse<T>;
        }

        return {
          success: true,
          data,
        };
      }),
    );
  }
}
