import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Entitlement } from '../entities/entitlement.entity';

@Injectable()
export class EntitlementsRepository {
  constructor(
    @InjectRepository(Entitlement)
    private readonly repository: Repository<Entitlement>,
  ) {}

  async create(data: Partial<Entitlement>): Promise<Entitlement> {
    const entitlement = this.repository.create(data);
    return this.repository.save(entitlement);
  }

  async findByUserAndAgent(
    userId: string,
    agentId: string,
  ): Promise<Entitlement | null> {
    return this.repository.findOne({
      where: {
        userId,
        agentId,
        isActive: true,
      },
    });
  }

  async findActiveByUser(userId: string): Promise<Entitlement[]> {
    return this.repository.find({
      where: {
        userId,
        isActive: true,
      },
      relations: ['agent'],
    });
  }

  async hasAccess(userId: string, agentId: string): Promise<boolean> {
    const entitlement = await this.repository.findOne({
      where: {
        userId,
        agentId,
        isActive: true,
      },
    });

    if (!entitlement) {
      return false;
    }

    // Check if expired
    if (entitlement.expiresAt && entitlement.expiresAt < new Date()) {
      // Auto-deactivate expired entitlements
      await this.repository.update(entitlement.id, { isActive: false });
      return false;
    }

    return true;
  }

  async revoke(userId: string, agentId: string): Promise<void> {
    await this.repository.update({ userId, agentId }, { isActive: false });
  }
}
