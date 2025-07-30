import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class DateTransformerInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => this.transformDates(data))
    );
  }

  private transformDates(data: any): any {
    if (Array.isArray(data)) {
      return data.map(item => this.transformDates(item));
    }

    if (data && typeof data === 'object') {
      const transformed = { ...data };
      
      // Transformar campos de data
      const dateFields = ['dueDate', 'paidDate', 'createdAt', 'updatedAt', 'recurrenceEndDate'];
      
      for (const field of dateFields) {
        if (transformed[field]) {
          // Verificar se é um objeto Date do Prisma
          if (typeof transformed[field] === 'object' && transformed[field] !== null) {
            // Se tem propriedades que indicam que é uma data do Prisma
            if (transformed[field].constructor && 
                (transformed[field].constructor.name === 'Date' || 
                 typeof transformed[field].toISOString === 'function')) {
              try {
                transformed[field] = transformed[field].toISOString();
              } catch (error) {
                console.log(`Error converting ${field}:`, error);
                // Se não conseguir converter, tentar outras abordagens
                if (transformed[field].getTime) {
                  transformed[field] = new Date(transformed[field].getTime()).toISOString();
                }
              }
            }
            // Se é um objeto vazio {}, pode ser um Date inválido do Prisma
            else if (Object.keys(transformed[field]).length === 0) {
              console.log(`Empty object detected for ${field}, removing it`);
              transformed[field] = null;
            }
          }
        }
      }

      // Recursivamente transformar propriedades aninhadas
      for (const key in transformed) {
        if (transformed[key] && typeof transformed[key] === 'object') {
          transformed[key] = this.transformDates(transformed[key]);
        }
      }

      return transformed;
    }

    return data;
  }
} 