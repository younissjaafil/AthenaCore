import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent, AgentVisibility, AgentStatus } from '../entities/agent.entity';

@Injectable()
export class AgentsRepository {
  constructor(
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
  ) {}

  async create(agentData: Partial<Agent>): Promise<Agent> {
    const agent = this.agentRepository.create(agentData);
    return this.agentRepository.save(agent);
  }

  async findAll(): Promise<Agent[]> {
    return this.agentRepository.find({
      relations: ['creator', 'creator.user'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<Agent | null> {
    return this.agentRepository.findOne({
      where: { id },
      relations: ['creator', 'creator.user'],
    });
  }

  async findByCreator(creatorId: string): Promise<Agent[]> {
    return this.agentRepository.find({
      where: { creatorId },
      relations: ['creator', 'creator.user'],
      order: { createdAt: 'DESC' },
    });
  }

  async findPublic(): Promise<Agent[]> {
    return this.agentRepository.find({
      where: {
        visibility: AgentVisibility.PUBLIC,
        status: AgentStatus.ACTIVE,
      },
      relations: ['creator', 'creator.user'],
      order: { averageRating: 'DESC' },
    });
  }

  async findByCategory(category: string): Promise<Agent[]> {
    return this.agentRepository.find({
      where: {
        category,
        visibility: AgentVisibility.PUBLIC,
        status: AgentStatus.ACTIVE,
      },
      relations: ['creator', 'creator.user'],
      order: { averageRating: 'DESC' },
    });
  }

  async findFree(): Promise<Agent[]> {
    return this.agentRepository.find({
      where: {
        isFree: true,
        visibility: AgentVisibility.PUBLIC,
        status: AgentStatus.ACTIVE,
      },
      relations: ['creator', 'creator.user'],
      order: { totalConversations: 'DESC' },
    });
  }

  async update(id: string, agentData: Partial<Agent>): Promise<Agent | null> {
    await this.agentRepository.update(id, agentData);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.agentRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async incrementConversationCount(id: string): Promise<void> {
    await this.agentRepository.increment({ id }, 'totalConversations', 1);
  }

  async incrementMessageCount(id: string, count: number = 1): Promise<void> {
    await this.agentRepository.increment({ id }, 'totalMessages', count);
  }

  async incrementDocumentCount(id: string): Promise<void> {
    await this.agentRepository.increment({ id }, 'totalDocuments', 1);
  }

  async decrementDocumentCount(id: string): Promise<void> {
    await this.agentRepository.decrement({ id }, 'totalDocuments', 1);
  }

  async updateRating(id: string, newRating: number): Promise<void> {
    const agent = await this.findById(id);
    if (!agent) return;

    const totalReviews = agent.totalReviews + 1;
    const averageRating =
      (agent.averageRating * agent.totalReviews + newRating) / totalReviews;

    await this.update(id, {
      averageRating: Math.round(averageRating * 100) / 100,
      totalReviews,
    });
  }
}
