import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../users/entities/user.entity';
import { Creator } from '../creators/entities/creator.entity';
import { Agent } from '../agents/entities/agent.entity';
import { Document } from '../documents/entities/document.entity';
import { Conversation } from '../conversations/entities/conversation.entity';
import { Message } from '../conversations/entities/message.entity';
import { Session } from '../sessions/entities/session.entity';
import { Transaction } from '../payments/entities/transaction.entity';
import { Entitlement } from '../payments/entities/entitlement.entity';
import { Embedding } from '../rag/entities/embedding.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Creator,
      Agent,
      Document,
      Conversation,
      Message,
      Session,
      Transaction,
      Entitlement,
      Embedding,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
