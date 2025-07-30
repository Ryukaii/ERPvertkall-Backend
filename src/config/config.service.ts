import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfigService {
  get databaseUrl(): string {
    return process.env.DATABASE_URL || 'postgresql://erp_user:erp_password@localhost:5432/erp_vertkall?schema=public';
  }

  get jwtSecret(): string {
    return process.env.JWT_SECRET || 'sua_chave_secreta_jwt_aqui_mude_em_producao';
  }

  get jwtExpiresIn(): string {
    return process.env.JWT_EXPIRES_IN || '7d';
  }

  get port(): number {
    return parseInt(process.env.PORT ?? '3000');
  }
} 