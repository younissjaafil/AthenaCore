import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Embedding } from './entities/embedding.entity';

export interface BM25SearchResult {
  id: string;
  agentId: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  bm25Score: number;
  metadata?: any;
}

@Injectable()
export class BM25Service {
  private readonly logger = new Logger(BM25Service.name);
  private readonly k1: number;
  private readonly b: number;

  constructor(
    @InjectRepository(Embedding)
    private readonly repository: Repository<Embedding>,
    private readonly configService: ConfigService,
  ) {
    // BM25 parameters (standard values)
    this.k1 = parseFloat(this.configService.get<string>('BM25_K1') || '1.5');
    this.b = parseFloat(this.configService.get<string>('BM25_B') || '0.75');
  }

  /**
   * Search embeddings using BM25 (PostgreSQL full-text search)
   */
  async search(
    agentId: string,
    query: string,
    limit: number = 20,
  ): Promise<BM25SearchResult[]> {
    try {
      // Convert query to tsquery format
      const tsQuery = this.buildTsQuery(query);

      // Use PostgreSQL's ts_rank_cd (cover density ranking) which is similar to BM25
      // We'll use ts_rank_cd with normalization for better BM25-like scoring
      const results = await this.repository
        .createQueryBuilder('e')
        .select([
          'e.id',
          'e.agentId',
          'e.documentId',
          'e.chunkIndex',
          'e.content',
          'e.metadata',
          // Use ts_rank_cd with normalization (32 = divide by length)
          `ts_rank_cd(e.content_tsvector, to_tsquery('english', :query), 32) as bm25_score`,
        ])
        .where('e.agentId = :agentId', { agentId })
        .andWhere('e.content_tsvector @@ to_tsquery(:query)', {
          query: tsQuery,
        })
        .orderBy('bm25_score', 'DESC')
        .limit(limit)
        .getRawMany();

      return results.map((r) => ({
        id: r.e_id,
        agentId: r.e_agentId,
        documentId: r.e_documentId,
        chunkIndex: r.e_chunkIndex,
        content: r.e_content,
        bm25Score: parseFloat(r.bm25_score) || 0,
        metadata: r.e_metadata,
      }));
    } catch (error: any) {
      this.logger.error(`BM25 search failed: ${error.message}`);
      // Return empty results on error rather than throwing
      return [];
    }
  }

  /**
   * Build PostgreSQL tsquery from user query
   * Converts query to phrase search with AND operators
   */
  private buildTsQuery(query: string): string {
    // Remove special characters and split into words
    const words = query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2) // Filter out very short words
      .slice(0, 10); // Limit to 10 words

    if (words.length === 0) {
      return ''; // Empty query
    }

    // Use phrase search: words must appear in order
    // Format: 'word1' <-> 'word2' <-> 'word3'
    // This ensures words appear close together
    return words.map((w) => `'${w.replace(/'/g, "''")}'`).join(' <-> ');
  }

  /**
   * Alternative: Use OR operator for broader matching
   */
  private buildTsQueryOR(query: string): string {
    const words = query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .slice(0, 10);

    if (words.length === 0) {
      return '';
    }

    // OR search: any word can match
    return words.map((w) => `'${w.replace(/'/g, "''")}'`).join(' | ');
  }

  /**
   * Get BM25 statistics for an agent
   */
  async getStats(agentId: string): Promise<{
    totalIndexedChunks: number;
    averageChunkLength: number;
  }> {
    try {
      const result = await this.repository
        .createQueryBuilder('e')
        .select('COUNT(e.id)', 'total')
        .addSelect('AVG(LENGTH(e.content))', 'avgLength')
        .where('e.agentId = :agentId', { agentId })
        .andWhere('e.content_tsvector IS NOT NULL')
        .getRawOne();

      return {
        totalIndexedChunks: parseInt(result.total) || 0,
        averageChunkLength: parseFloat(result.avgLength) || 0,
      };
    } catch (error: any) {
      this.logger.error(`BM25 stats failed: ${error.message}`);
      return {
        totalIndexedChunks: 0,
        averageChunkLength: 0,
      };
    }
  }
}
