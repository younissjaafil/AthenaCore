import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ClerkStrategy } from './strategies/clerk.strategy';
import { WebhooksController } from './controllers/webhooks.controller';
import { UsersModule } from '../users/users.module';
import { ConfigModule } from '../../config/config.module';

@Module({
  imports: [PassportModule, UsersModule, ConfigModule],
  controllers: [AuthController, WebhooksController],
  providers: [AuthService, ClerkStrategy],
  exports: [AuthService],
})
export class AuthModule {}
