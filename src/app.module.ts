import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Config
import { ConfigModule } from './config/config.module';

// Guards
import { ClerkAuthGuard } from './modules/auth/guards/clerk-auth.guard';

// Infrastructure
import { DatabaseModule } from './infrastructure/database/database.module';
import { RedisModule } from './infrastructure/cache/redis.module';
import { S3Module } from './infrastructure/storage/s3.module';
import { VectorDbModule } from './infrastructure/vector-store/vectordb.module';
import { QueueModule } from './infrastructure/messaging/queue.module';
import { HttpModule } from './infrastructure/http/http.module';

// Feature Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CreatorsModule } from './modules/creators/creators.module';
import { ProfileModule } from './modules/profiles/profile.module';
import { AgentsModule } from './modules/agents/agents.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { RagModule } from './modules/rag/rag.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthModule } from './modules/health/health.module';
import { FeedModule } from './modules/feed/feed.module';
import { AcademicModule } from './modules/academic/academic.module';

@Module({
  imports: [
    // Config (must be first)
    ConfigModule,

    // Infrastructure
    DatabaseModule,
    RedisModule,
    S3Module,
    VectorDbModule,
    QueueModule,
    HttpModule,

    // Feature Modules
    AuthModule,
    UsersModule,
    CreatorsModule,
    ProfileModule,
    AgentsModule,
    DocumentsModule,
    RagModule,
    ConversationsModule,
    PaymentsModule,
    SessionsModule,
    NotificationsModule,
    AdminModule,
    HealthModule,
    FeedModule,
    AcademicModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global authentication guard
    {
      provide: APP_GUARD,
      useClass: ClerkAuthGuard,
    },
  ],
})
export class AppModule {}
