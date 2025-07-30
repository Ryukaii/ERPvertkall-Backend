import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class AmountTransformerInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => this.transformAmounts(data))
    );
  }

  private transformAmounts(data: any): any {
    if (Array.isArray(data)) {
      return data.map(item => this.transformAmounts(item));
    }

    if (data && typeof data === 'object') {
      const transformed = { ...data };
      
      // Transformar amount de centavos para reais
      if (transformed.amount !== undefined && typeof transformed.amount === 'number') {
        transformed.amount = transformed.amount / 100;
      }

      // Recursivamente transformar propriedades aninhadas
      for (const key in transformed) {
        if (transformed[key] && typeof transformed[key] === 'object') {
          transformed[key] = this.transformAmounts(transformed[key]);
        }
      }

      return transformed;
    }

    return data;
  }
} 