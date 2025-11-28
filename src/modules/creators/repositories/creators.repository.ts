import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Creator, CreatorStatus } from '../entities/creator.entity';

@Injectable()
export class CreatorsRepository {
  constructor(
    @InjectRepository(Creator)
    private readonly creatorRepository: Repository<Creator>,
  ) {}

  async create(creatorData: Partial<Creator>): Promise<Creator> {
    const creator = this.creatorRepository.create(creatorData);
    return this.creatorRepository.save(creator);
  }

  async findAll(): Promise<Creator[]> {
    return this.creatorRepository.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<Creator | null> {
    return this.creatorRepository.findOne({
      where: { id },
      relations: ['user'],
    });
  }

  async findByUserId(userId: string): Promise<Creator | null> {
    return this.creatorRepository.findOne({
      where: { userId },
      relations: ['user'],
    });
  }

  async findVerified(): Promise<Creator[]> {
    return this.creatorRepository.find({
      where: { status: CreatorStatus.VERIFIED },
      relations: ['user'],
      order: { averageRating: 'DESC' },
    });
  }

  async findAvailable(): Promise<Creator[]> {
    return this.creatorRepository.find({
      where: { status: CreatorStatus.VERIFIED, isAvailable: true },
      relations: ['user'],
      order: { averageRating: 'DESC' },
    });
  }

  async update(
    id: string,
    creatorData: Partial<Creator>,
  ): Promise<Creator | null> {
    await this.creatorRepository.update(id, creatorData);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.creatorRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async incrementAgentCount(id: string): Promise<void> {
    await this.creatorRepository.increment({ id }, 'totalAgents', 1);
  }

  async decrementAgentCount(id: string): Promise<void> {
    await this.creatorRepository.decrement({ id }, 'totalAgents', 1);
  }

  async incrementSessionCount(id: string): Promise<void> {
    await this.creatorRepository.increment({ id }, 'totalSessions', 1);
  }

  async updateRating(id: string, newRating: number): Promise<void> {
    const creator = await this.findById(id);
    if (!creator) return;

    const totalReviews = creator.totalReviews + 1;
    const averageRating =
      (creator.averageRating * creator.totalReviews + newRating) / totalReviews;

    await this.update(id, {
      averageRating: Math.round(averageRating * 100) / 100,
      totalReviews,
    });
  }

  async addEarnings(id: string, amount: number): Promise<void> {
    await this.creatorRepository.increment({ id }, 'totalEarnings', amount);
  }
}
