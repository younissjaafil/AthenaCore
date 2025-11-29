/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import { Injectable, Logger, Inject } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { EmbeddingsRepository } from './repositories/embeddings.repository';
import { EmbeddingsService } from './embeddings.service';

export interface SearchResult {
  id: string;
  agentId: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  similarity: number;
  metadata?: any;
  tokenCount: number;
  createdAt: Date;
}

@Injectable()
export class VectorSearchService {
  private readonly logger = new Logger(VectorSearchService.name);
  private readonly cacheKeyPrefix = 'vector_search';
  private readonly cacheTTL = 3600; // 1 hour in seconds

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly embeddingsRepository: EmbeddingsRepository,
    private readonly embeddingsService: EmbeddingsService,
  ) {}

  /**
   * Perform similarity search for a query
   */
  async search(
    agentId: string,
    query: string,
    limit: number = 5,
    threshold: number = 0.7,
  ): Promise<SearchResult[]> {
    this.logger.log(
      `RAG Search - Agent: ${agentId}, Query: "${query.substring(0, 50)}...", Limit: ${limit}, Threshold: ${threshold}`,
    );

    // Check cache first
    const cacheKey = this.getCacheKey(agentId, query, limit, threshold);
    const cached = await this.cacheManager.get<SearchResult[]>(cacheKey);
    if (cached) {
      this.logger.log(
        `Cache hit for query - returning ${cached.length} cached results`,
      );
      return cached;
    }

    // Generate query embedding
    this.logger.log('Generating query embedding...');
    const queryVector =
      await this.embeddingsService.generateQueryEmbedding(query);
    this.logger.log(
      `Query embedding generated, vector length: ${queryVector.length}`,
    );

    // Perform similarity search
    this.logger.log('Searching Qdrant...');
    const results = await this.embeddingsRepository.similaritySearch(
      agentId,
      queryVector,
      limit,
      threshold,
    );
    this.logger.log(`Qdrant returned ${results.length} results`);

    // Map results
    const searchResults: SearchResult[] = results.map((result) => ({
      id: result.embedding.id,
      agentId: result.embedding.agentId,
      documentId: result.embedding.documentId,
      chunkIndex: result.embedding.chunkIndex,
      content: result.embedding.content,
      similarity: result.similarity,
      metadata: result.embedding.metadata,
      tokenCount: result.embedding.tokenCount,
      createdAt: result.embedding.createdAt,
    }));

    // Cache results
    await this.cacheManager.set(cacheKey, searchResults, this.cacheTTL);
    this.logger.log(
      `Found ${searchResults.length} results with similarity >= ${threshold}`,
    );

    return searchResults;
  }

  /**
   * Get relevant context for RAG
   */
  async getContext(
    agentId: string,
    query: string,
    maxTokens: number = 2000,
  ): Promise<string> {
    const results = await this.search(agentId, query, 10, 0.6);

    let context = '';
    let totalTokens = 0;

    for (const result of results) {
      if (totalTokens + result.tokenCount > maxTokens) {
        break;
      }

      context += `\n\n--- Context from ${result.metadata?.heading || 'document'} (similarity: ${Math.round(result.similarity * 100)}%) ---\n${result.content}`;
      totalTokens += result.tokenCount;
    }

    this.logger.log(
      `Built context with ${totalTokens} tokens from ${results.length} chunks`,
    );
    return context.trim();
  }

  /**
   * Clear cache for an agent
   */
  clearAgentCache(agentId: string): void {
    // Note: cache-manager doesn't support pattern deletion by default
    // This is a simplified implementation - in production, use Redis SCAN
    this.logger.log(`Cache clear requested for agent ${agentId}`);
  }

  /**
   * Generate cache key
   */
  private getCacheKey(
    agentId: string,
    query: string,
    limit: number,
    threshold: number,
  ): string {
    const queryHash = Buffer.from(query).toString('base64').slice(0, 32);
    return `${this.cacheKeyPrefix}:${agentId}:${queryHash}:${limit}:${threshold}`;
  }

  /**
   * Get search statistics
   */
  async getSearchStats(agentId: string): Promise<{
    totalEmbeddings: number;
    totalDocuments: number;
    averageChunksPerDoc: number;
    totalTokens: number;
  }> {
    return this.embeddingsService.getAgentStats(agentId);
  }
}
