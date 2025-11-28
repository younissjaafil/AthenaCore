import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message, MessageRole } from '../entities/message.entity';

@Injectable()
export class MessagesRepository {
  constructor(
    @InjectRepository(Message)
    private readonly repository: Repository<Message>,
  ) {}

  async create(data: Partial<Message>): Promise<Message> {
    const message = this.repository.create(data);
    return this.repository.save(message);
  }

  async findByConversation(
    conversationId: string,
    limit: number = 50,
  ): Promise<Message[]> {
    return this.repository.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
      take: limit,
    });
  }

  async getConversationHistory(
    conversationId: string,
    limit: number = 10,
  ): Promise<Array<{ role: MessageRole; content: string }>> {
    const messages = await this.repository.find({
      where: { conversationId },
      order: { createdAt: 'DESC' },
      take: limit,
      select: ['role', 'content'],
    });

    // Reverse to get chronological order
    return messages.reverse().map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  async countByConversation(conversationId: string): Promise<number> {
    return this.repository.count({ where: { conversationId } });
  }
}
