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
      relations: ['agent'],
    });
  }

  async findByAgent(agentId: string): Promise<Document[]> {
    return this.repository.find({
      where: { agentId, status: DocumentStatus.PROCESSED },
      order: { createdAt: 'DESC' },
    });
  }

  async findByAgentList(agentIds: string[]): Promise<Document[]> {
    if (agentIds.length === 0) return [];
    return this.repository
      .createQueryBuilder('document')
      .where('document.agent_id IN (:...agentIds)', { agentIds })
      .leftJoinAndSelect('document.agent', 'agent')
      .orderBy('document.created_at', 'DESC')
      .getMany();
  }

  async findAllByAgent(agentId: string): Promise<Document[]> {
    return this.repository.find({
      where: { agentId },
      order: { createdAt: 'DESC' },
    });
  }

  async findPendingProcessing(): Promise<Document[]> {
    return this.repository.find({
      where: [
        { status: DocumentStatus.UPLOADED },
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

    if (status === DocumentStatus.FAILED && errorMessage) {
      updateData.errorMessage = errorMessage;
    }

    await this.repository.update(id, updateData);
  }

  async updateProcessingMetrics(
    id: string,
    metrics: {
      chunkCount?: number;
      embeddingCount?: number;
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
      completed: documents.filter((d) => d.status === DocumentStatus.PROCESSED)
        .length,
      processing: documents.filter(
        (d) =>
          d.status === DocumentStatus.UPLOADED ||
          d.status === DocumentStatus.PROCESSING,
      ).length,
      failed: documents.filter((d) => d.status === DocumentStatus.FAILED)
        .length,
      totalSize: documents.reduce((sum, d) => sum + Number(d.fileSize), 0),
    };
  }

  async findByCreator(creatorId: string): Promise<Document[]> {
    return this.repository
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.agent', 'agent')
      .where('agent.creator_id = :creatorId', { creatorId })
      .andWhere('document.status = :status', {
        status: DocumentStatus.PROCESSED,
      })
      .orderBy('document.created_at', 'DESC')
      .getMany();
  }

  async findPublicByCreator(creatorId: string): Promise<Document[]> {
    return this.repository
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.agent', 'agent')
      .where('agent.creator_id = :creatorId', { creatorId })
      .andWhere('agent.is_public = :isPublic', { isPublic: true })
      .andWhere('agent.status = :agentStatus', { agentStatus: 'active' })
      .andWhere('document.status = :status', {
        status: DocumentStatus.PROCESSED,
      })
      .orderBy('document.created_at', 'DESC')
      .getMany();
  }
}
