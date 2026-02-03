import { type CallHandler, type ExecutionContext, Injectable, type NestInterceptor } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  data: T;
  meta: Record<string, unknown>;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((response) => {
        // If response already has data/meta structure, return as-is
        if (response && typeof response === 'object' && 'data' in response && 'meta' in response) {
          return response;
        }

        // Extract meta if present in response
        if (response && typeof response === 'object' && 'meta' in response) {
          const { meta, ...data } = response;
          return { data, meta };
        }

        // Wrap response in standard structure
        return {
          data: response,
          meta: {},
        };
      }),
    );
  }
}
