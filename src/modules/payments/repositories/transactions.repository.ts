import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, TransactionStatus } from '../entities/transaction.entity';

@Injectable()
export class TransactionsRepository {
  constructor(
    @InjectRepository(Transaction)
    private readonly repository: Repository<Transaction>,
  ) {}

  async create(data: Partial<Transaction>): Promise<Transaction> {
    const transaction = this.repository.create(data);
    return this.repository.save(transaction);
  }

  async findById(id: string): Promise<Transaction | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByExternalId(externalId: string): Promise<Transaction | null> {
    return this.repository.findOne({ where: { externalId } });
  }

  async findByUser(userId: string): Promise<Transaction[]> {
    return this.repository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async update(id: string, data: Partial<Transaction>): Promise<void> {
    await this.repository.update(id, data);
  }

  async getNextExternalId(): Promise<string> {
    // Use timestamp + random number to avoid conflicts with previously used IDs
    // This ensures uniqueness even after database reset
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return String(timestamp * 1000 + random);
  }

  async updateStatus(
    id: string,
    status: TransactionStatus,
    payerPhoneNumber?: string,
  ): Promise<void> {
    const updateData: Partial<Transaction> = {
      status,
      updatedAt: new Date(),
    };
    if (status === TransactionStatus.SUCCESS) {
      updateData.completedAt = new Date();
    }
    if (payerPhoneNumber) {
      updateData.payerPhoneNumber = payerPhoneNumber;
    }
    await this.repository.update(id, updateData);
  }

  async findByStatus(status: TransactionStatus): Promise<Transaction[]> {
    return this.repository.find({
      where: { status },
      order: { createdAt: 'DESC' },
    });
  }

  async getRevenueByAgentIds(agentIds: string[]): Promise<{
    totalRevenue: number;
    transactionCount: number;
    revenueByAgent: { agentId: string; revenue: number; count: number }[];
  }> {
    if (agentIds.length === 0) {
      return { totalRevenue: 0, transactionCount: 0, revenueByAgent: [] };
    }

    const result = await this.repository
      .createQueryBuilder('transaction')
      .select('transaction.agent_id', 'agentId')
      .addSelect('SUM(transaction.amount)', 'revenue')
      .addSelect('COUNT(*)', 'count')
      .where('transaction.agent_id IN (:...agentIds)', { agentIds })
      .andWhere('transaction.status = :status', {
        status: TransactionStatus.SUCCESS,
      })
      .groupBy('transaction.agent_id')
      .getRawMany<{ agentId: string; revenue: string; count: string }>();

    const revenueByAgent = result.map((r) => ({
      agentId: r.agentId,
      revenue: parseFloat(r.revenue) || 0,
      count: parseInt(r.count, 10) || 0,
    }));

    const totalRevenue = revenueByAgent.reduce((sum, r) => sum + r.revenue, 0);
    const transactionCount = revenueByAgent.reduce(
      (sum, r) => sum + r.count,
      0,
    );

    return { totalRevenue, transactionCount, revenueByAgent };
  }
}
