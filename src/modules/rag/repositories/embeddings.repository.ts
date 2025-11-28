/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Embedding } from '../entities/embedding.entity';

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
  ) {}

  async create(data: Partial<Embedding>): Promise<Embedding> {
    const embedding = this.repository.create(data);
    return this.repository.save(embedding);
  }

  async createBulk(data: Partial<Embedding>[]): Promise<Embedding[]> {
    const embeddings = this.repository.create(data);
    return this.repository.save(embeddings);
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
    // Use pgvector's <=> operator for cosine distance
    // Cosine distance returns 0 for identical vectors, 2 for opposite
    // Similarity = 1 - (distance / 2)
    const query = `
      SELECT 
        e.*,
        1 - (e.vector <=> $1::vector) as similarity
      FROM embeddings e
      WHERE e."agentId" = $2
        AND 1 - (e.vector <=> $1::vector) >= $3
      ORDER BY e.vector <=> $1::vector
      LIMIT $4
    `;

    const results = await this.repository.query(query, [
      JSON.stringify(queryVector),
      agentId,
      threshold,
      limit,
    ]);

    return results.map((row: any) => ({
      embedding: this.repository.create({
        id: row.id,
        agentId: row.agentId,
        documentId: row.documentId,
        chunkIndex: row.chunkIndex,
        content: row.content,
        tokenCount: row.tokenCount,
        startPosition: row.startPosition,
        endPosition: row.endPosition,
        vector: row.vector,
        model: row.model,
        metadata: row.metadata,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }),
      similarity: parseFloat(row.similarity),
    }));
  }

  async deleteByDocument(documentId: string): Promise<void> {
    await this.repository.delete({ documentId });
  }

  async deleteByAgent(agentId: string): Promise<void> {
    await this.repository.delete({ agentId });
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
