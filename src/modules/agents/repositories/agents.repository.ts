import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from '../entities/agent.entity';

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

  async findPublicByCreator(creatorId: string): Promise<Agent[]> {
    return this.agentRepository.find({
      where: {
        creatorId,
        isPublic: true,
        status: 'active',
      },
      relations: ['creator', 'creator.user'],
      order: { createdAt: 'DESC' },
    });
  }

  async findPublic(): Promise<Agent[]> {
    return this.agentRepository.find({
      where: {
        isPublic: true,
        status: 'active',
      },
      relations: ['creator', 'creator.user'],
      order: { averageRating: 'DESC' },
    });
  }

  async findByCategory(category: string): Promise<Agent[]> {
    // Note: category is an array in DB, this may need query builder for proper filtering
    return this.agentRepository.find({
      where: {
        isPublic: true,
        status: 'active',
      },
      relations: ['creator', 'creator.user'],
      order: { averageRating: 'DESC' },
    });
  }

  async findFree(): Promise<Agent[]> {
    return this.agentRepository.find({
      where: {
        isFree: true,
        isPublic: true,
        status: 'active',
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

  async updateRating(id: string, newRating: number): Promise<void> {
    // Simple rating update - just set the new average
    await this.update(id, {
      averageRating: Math.round(newRating * 100) / 100,
    });
  }
}
