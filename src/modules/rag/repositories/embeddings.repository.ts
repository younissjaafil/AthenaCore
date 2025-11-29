/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Embedding } from '../entities/embedding.entity';
import { QdrantService } from '../../../infrastructure/vector-store/qdrant.service';
import { v4 as uuidv4 } from 'uuid';

export interface SimilaritySearchResult {
  embedding: Embedding;
  similarity: number;
}

@Injectable()
export class EmbeddingsRepository {
  private readonly logger = new Logger(EmbeddingsRepository.name);

  constructor(
    @InjectRepository(Embedding)
    private readonly repository: Repository<Embedding>,
    private readonly qdrantService: QdrantService,
  ) {}

  async create(data: Partial<Embedding>): Promise<Embedding> {
    // Generate ID if not provided
    const id = data.id || uuidv4();
    const embeddingData = { ...data, id };

    // Save metadata to PostgreSQL (without vector)
    const embedding = this.repository.create(embeddingData);
    const saved = await this.repository.save(embedding);

    // Store vector in Qdrant
    if (data.vector) {
      await this.qdrantService.upsertPoints([
        {
          id: saved.id,
          vector: data.vector,
          payload: {
            agentId: saved.agentId,
            documentId: saved.documentId,
            chunkIndex: saved.chunkIndex,
            content: saved.content,
            tokenCount: saved.tokenCount,
          },
        },
      ]);
    }

    return saved;
  }

  async createBulk(data: Partial<Embedding>[]): Promise<Embedding[]> {
    // Generate IDs and prepare data
    const embeddingsWithIds = data.map((d) => ({
      ...d,
      id: d.id || uuidv4(),
    }));

    // Save metadata to PostgreSQL
    const embeddings = this.repository.create(embeddingsWithIds);
    const saved = await this.repository.save(embeddings);

    // Store vectors in Qdrant
    const vectorPoints = saved
      .map((embedding, idx) => {
        const vector = data[idx].vector;
        if (!vector) return null;
        return {
          id: embedding.id,
          vector,
          payload: {
            agentId: embedding.agentId,
            documentId: embedding.documentId,
            chunkIndex: embedding.chunkIndex,
            content: embedding.content,
            tokenCount: embedding.tokenCount,
          },
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    if (vectorPoints.length > 0) {
      await this.qdrantService.upsertPoints(vectorPoints);
      this.logger.log(`Stored ${vectorPoints.length} vectors in Qdrant`);
    }

    return saved;
  }

  async findById(id: string): Promise<Embedding | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['document', 'agent'],
    });
  }

  async findByDocument(documentId: string): Promise<Embedding[]> {
    return this.repository.find({
      where: { documentId },
      order: { chunkIndex: 'ASC' },
    });
  }

  async findByAgent(agentId: string): Promise<Embedding[]> {
    return this.repository.find({
      where: { agentId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async similaritySearch(
    agentId: string,
    queryVector: number[],
    limit: number = 5,
    threshold: number = 0.7,
  ): Promise<SimilaritySearchResult[]> {
    // Search in Qdrant
    const results = await this.qdrantService.search(
      agentId,
      queryVector,
      limit,
      threshold,
    );

    // Fetch full embedding records from PostgreSQL
    const embeddingResults: SimilaritySearchResult[] = [];
    for (const result of results) {
      const embedding = await this.repository.findOne({
        where: { id: result.id },
        relations: ['document', 'agent'],
      });
      if (embedding) {
        embeddingResults.push({
          embedding,
          similarity: result.score,
        });
      }
    }

    return embeddingResults;
  }

  async deleteByDocument(documentId: string): Promise<void> {
    // Delete from both Qdrant and PostgreSQL
    await this.qdrantService.deleteByDocument(documentId);
    await this.repository.delete({ documentId });
    this.logger.log(`Deleted embeddings for document ${documentId}`);
  }

  async deleteByAgent(agentId: string): Promise<void> {
    // Delete from both Qdrant and PostgreSQL
    await this.qdrantService.deleteByAgent(agentId);
    await this.repository.delete({ agentId });
    this.logger.log(`Deleted embeddings for agent ${agentId}`);
  }

  async countByAgent(agentId: string): Promise<number> {
    return this.repository.count({ where: { agentId } });
  }

  async countByDocument(documentId: string): Promise<number> {
    return this.repository.count({ where: { documentId } });
  }

  async getStats(agentId: string): Promise<{
    totalEmbeddings: number;
    totalDocuments: number;
    averageChunksPerDoc: number;
    totalTokens: number;
  }> {
    const result = await this.repository
      .createQueryBuilder('e')
      .select('COUNT(DISTINCT e.documentId)', 'totalDocuments')
      .addSelect('COUNT(e.id)', 'totalEmbeddings')
      .addSelect('SUM(e.tokenCount)', 'totalTokens')
      .where('e.agentId = :agentId', { agentId })
      .getRawOne();

    return {
      totalEmbeddings: parseInt(result.totalEmbeddings) || 0,
      totalDocuments: parseInt(result.totalDocuments) || 0,
      averageChunksPerDoc:
        result.totalDocuments > 0
          ? Math.round(result.totalEmbeddings / result.totalDocuments)
          : 0,
      totalTokens: parseInt(result.totalTokens) || 0,
    };
  }
}
