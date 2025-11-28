import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { ConversationsRepository } from './repositories/conversations.repository';
import { MessagesRepository } from './repositories/messages.repository';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { Agent } from '../agents/entities/agent.entity';
import { RagModule } from '../rag/rag.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, Message, Agent]),
    RagModule,
  ],
  controllers: [ConversationsController],
  providers: [
    ConversationsService,
    ConversationsRepository,
    MessagesRepository,
  ],
  exports: [ConversationsService],
})
export class ConversationsModule {}
