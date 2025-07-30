import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../config/prisma.service';
import { ConfigService } from '../../../config/config.service';

export interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.jwtSecret,
    });
  }

  async validate(payload: JwtPayload) {
    try {
      this.logger.debug(`Validating JWT payload for user: ${payload.sub}`);
      
      // Check if database is connected
      if (!this.prisma.getConnectionStatus()) {
        this.logger.error('Database not connected during JWT validation');
        throw new UnauthorizedException('Service temporarily unavailable');
      }
      
      // Use retry logic for database operations
      const user = await this.prisma.executeWithRetry(async () => {
        return this.prisma.user.findUnique({
          where: { id: payload.sub },
          include: {
            userPermissions: {
              include: {
                module: true,
              },
            },
          },
        });
      });

      if (!user) {
        this.logger.warn(`User not found for ID: ${payload.sub}`);
        throw new UnauthorizedException('User not found');
      }

      this.logger.debug(`User validated successfully: ${user.email}`);
      return user;
    } catch (error) {
      this.logger.error(`JWT validation error: ${error.message}`, error.stack);
      
      // If it's a connection pool error, we should still throw UnauthorizedException
      // to avoid exposing internal database errors
      if (error.code === 'P2024') {
        this.logger.error('Database connection pool timeout during JWT validation');
      }
      
      throw new UnauthorizedException('Invalid token');
    }
  }
} 