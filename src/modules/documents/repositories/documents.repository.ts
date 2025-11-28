import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document, DocumentStatus } from '../entities/document.entity';

@Injectable()
export class DocumentsRepository {
  constructor(
    @InjectRepository(Document)
    private readonly repository: Repository<Document>,
  ) {}

  async create(data: Partial<Document>): Promise<Document> {
    const document = this.repository.create(data);
    return this.repository.save(document);
  }

  async findById(id: string): Promise<Document | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['agent', 'user'],
    });
  }

  async findByAgent(agentId: string): Promise<Document[]> {
    return this.repository.find({
      where: { agentId, status: DocumentStatus.COMPLETED },
      order: { createdAt: 'DESC' },
    });
  }

  async findByUser(userId: string): Promise<Document[]> {
    return this.repository.find({
      where: { userId },
      relations: ['agent'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByAgentAndUser(
    agentId: string,
    userId: string,
  ): Promise<Document[]> {
    return this.repository.find({
      where: { agentId, userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findPendingProcessing(): Promise<Document[]> {
    return this.repository.find({
      where: [
        { status: DocumentStatus.UPLOADING },
        { status: DocumentStatus.PROCESSING },
      ],
      order: { createdAt: 'ASC' },
      take: 10,
    });
  }

  async update(id: string, data: Partial<Document>): Promise<Document | null> {
    await this.repository.update(id, data);
    return this.findById(id);
  }

  async updateStatus(
    id: string,
    status: DocumentStatus,
    errorMessage?: string,
  ): Promise<void> {
    const updateData: Partial<Document> = { status };

    if (status === DocumentStatus.PROCESSING) {
      updateData.processingStartedAt = new Date();
    } else if (status === DocumentStatus.COMPLETED) {
      updateData.processingCompletedAt = new Date();
    } else if (status === DocumentStatus.FAILED && errorMessage) {
      updateData.errorMessage = errorMessage;
    }

    await this.repository.update(id, updateData);
  }

  async updateProcessingMetrics(
    id: string,
    metrics: {
      chunkCount?: number;
      embeddingCount?: number;
      characterCount?: number;
      wordCount?: number;
      pageCount?: number;
    },
  ): Promise<void> {
    await this.repository.update(id, metrics);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async getStatsByAgent(agentId: string): Promise<{
    total: number;
    completed: number;
    processing: number;
    failed: number;
    totalSize: number;
  }> {
    const documents = await this.repository.find({
      where: { agentId },
      select: ['status', 'fileSize'],
    });

    return {
      total: documents.length,
      completed: documents.filter((d) => d.status === DocumentStatus.COMPLETED)
        .length,
      processing: documents.filter(
        (d) =>
          d.status === DocumentStatus.UPLOADING ||
          d.status === DocumentStatus.PROCESSING,
      ).length,
      failed: documents.filter((d) => d.status === DocumentStatus.FAILED)
        .length,
      totalSize: documents.reduce((sum, d) => sum + Number(d.fileSize), 0),
    };
  }
}
