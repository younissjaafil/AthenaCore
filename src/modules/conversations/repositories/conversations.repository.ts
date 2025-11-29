import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import {
  Conversation,
  ConversationStatus,
} from '../entities/conversation.entity';

@Injectable()
export class ConversationsRepository {
  constructor(
    @InjectRepository(Conversation)
    private readonly repository: Repository<Conversation>,
  ) {}

  async create(data: Partial<Conversation>): Promise<Conversation> {
    const conversation = this.repository.create(data);
    return this.repository.save(conversation);
  }

  async findById(
    id: string,
    relations?: string[],
  ): Promise<Conversation | null> {
    return this.repository.findOne({
      where: { id },
      relations,
    });
  }

  async findByUserAndAgent(
    userId: string,
    agentId: string,
  ): Promise<Conversation | null> {
    return this.repository.findOne({
      where: {
        userId,
        agentId,
        isArchived: false,
      },
      order: { updatedAt: 'DESC' },
    });
  }

  async findByUser(
    userId: string,
    status?: ConversationStatus,
  ): Promise<Conversation[]> {
    const where: FindOptionsWhere<Conversation> = { userId };
    if (status === ConversationStatus.ARCHIVED) {
      where.isArchived = true;
    } else if (status === ConversationStatus.ACTIVE) {
      where.isArchived = false;
    }

    return this.repository.find({
      where,
      relations: ['agent'],
      order: { updatedAt: 'DESC' },
    });
  }

  async update(id: string, data: Partial<Conversation>): Promise<void> {
    await this.repository.update(id, data);
  }

  async incrementMessageCount(id: string): Promise<void> {
    await this.repository.increment({ id }, 'totalMessages', 1);
  }

  async incrementTokenCount(id: string, tokens: number): Promise<void> {
    await this.repository.increment({ id }, 'totalTokens', tokens);
  }
}
