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
}
