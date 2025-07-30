import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from './config/config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const configService = app.get(ConfigService);

  // Habilitar CORS para comunicação com frontend
  const allowedOrigins = process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL || 'https://your-frontend-domain.com'] // Configure FRONTEND_URL in production
    : ['http://localhost:5173', 'http://localhost:3000']; // Development origins
  
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Validação global de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remove propriedades não definidas nos DTOs
      forbidNonWhitelisted: true, // Rejeita requisições com propriedades extras
      transform: true, // Transforma tipos automaticamente
    }),
  );

  // Prefixo global para todas as rotas da API
  app.setGlobalPrefix('api');

  const port = configService.port;
  await app.listen(port);
  
  console.log(`🚀 ERP Vertkall Backend running on: http://localhost:${port}/api`);
}
bootstrap();
