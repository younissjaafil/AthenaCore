import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';

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

  async findByExternalId(externalId: number): Promise<Transaction | null> {
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

  async getNextExternalId(): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('transaction')
      .select('MAX(transaction.externalId)', 'max')
      .getRawOne<{ max: number }>();

    return (result?.max || 0) + 1;
  }
}
