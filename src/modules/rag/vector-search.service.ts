/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import { Injectable, Logger, Inject } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { EmbeddingsRepository } from './repositories/embeddings.repository';
import { EmbeddingsService } from './embeddings.service';
import { RagCitation } from './entities/rag-query-log.entity';

export interface SearchResult {
  id: string;
  agentId: string;
  documentId: string;
  documentName?: string; // Added for better display
  chunkIndex: number;
  content: string;
  similarity: number;
  metadata?: any;
  tokenCount: number;
  createdAt: Date;
}

export interface AgentRagConfig {
  ragSimilarityThreshold: number;
  ragMaxResults: number;
  ragMaxTokens: number;
  ragMinConfidenceThreshold: number;
  ragEnableGuardrails: boolean;
  ragEnableReranking: boolean;
  ragIdkMessage?: string;
}

export type RagOutcome = 'answered' | 'idk';

export interface GuardrailResult {
  outcome: RagOutcome;
  reason?: string;
}

export interface SearchWithGuardrailsResult {
  results: SearchResult[];
  citations: RagCitation[];
  context: string;
  contextTokenCount: number;
  guardrail: GuardrailResult;
  retrievalMs: number;
}

const DEFAULT_IDK_MESSAGE =
  "I'm not confident this is covered in the current documents. It may be outside the scope of my knowledge base.";

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
    // Check cache first
    const cacheKey = this.getCacheKey(agentId, query, limit, threshold);
    const cached = await this.cacheManager.get<SearchResult[]>(cacheKey);
    if (cached) {
      this.logger.log(`RAG cache hit: ${cached.length} results`);
      return cached;
    }

    // Generate query embedding
    const queryVector =
      await this.embeddingsService.generateQueryEmbedding(query);

    // Perform similarity search
    const results = await this.embeddingsRepository.similaritySearch(
      agentId,
      queryVector,
      limit,
      threshold,
    );

    // Map results with document names
    const searchResults: SearchResult[] = results.map((result) => {
      // Get document name from the document relation or metadata
      const documentName =
        result.embedding.document?.filename ||
        result.embedding.metadata?.documentTitle ||
        `Document ${result.embedding.chunkIndex + 1}`;

      return {
        id: result.embedding.id,
        agentId: result.embedding.agentId,
        documentId: result.embedding.documentId,
        documentName,
        chunkIndex: result.embedding.chunkIndex,
        content: result.embedding.content,
        similarity: result.similarity,
        metadata: result.embedding.metadata,
        tokenCount: result.embedding.tokenCount,
        createdAt: result.embedding.createdAt,
      };
    });

    // Cache results
    await this.cacheManager.set(cacheKey, searchResults, this.cacheTTL);
    this.logger.log(`RAG search: ${searchResults.length} chunks retrieved`);

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
   * Enhanced search with guardrails, reranking, and enterprise features.
   * Returns search results along with guardrail outcome (answered/idk).
   */
  async searchWithGuardrails(
    agentId: string,
    query: string,
    config: AgentRagConfig,
  ): Promise<SearchWithGuardrailsResult> {
    const t0 = Date.now();

    // Perform similarity search
    const results = await this.search(
      agentId,
      query,
      config.ragMaxResults,
      config.ragSimilarityThreshold,
    );

    const retrievalMs = Date.now() - t0;

    // Calculate max similarity
    const maxSimilarity =
      results.length > 0 ? Math.max(...results.map((r) => r.similarity)) : 0;

    // Guardrail check: if no results or similarity too low
    if (config.ragEnableGuardrails) {
      if (results.length === 0) {
        return {
          results: [],
          citations: [],
          context: '',
          contextTokenCount: 0,
          guardrail: { outcome: 'idk', reason: 'no_results' },
          retrievalMs,
        };
      }

      if (maxSimilarity < config.ragMinConfidenceThreshold) {
        return {
          results,
          citations: this.buildCitations(results),
          context: '',
          contextTokenCount: 0,
          guardrail: { outcome: 'idk', reason: 'low_similarity' },
          retrievalMs,
        };
      }
    }

    // Apply reranking if enabled (sort by similarity descending)
    let orderedResults = results;
    if (config.ragEnableReranking) {
      orderedResults = [...results].sort((a, b) => b.similarity - a.similarity);
    }

    // Build context with token budget and better formatting
    let context = '';
    let contextTokenCount = 0;
    let sourceNum = 1;

    for (const result of orderedResults) {
      if (contextTokenCount + result.tokenCount > config.ragMaxTokens) {
        break;
      }

      // Build a clear source label with document name, section, and relevance
      const sourceLabel = this.buildSourceLabel(result, sourceNum);
      context += `\n\n${sourceLabel}\n${result.content}`;
      contextTokenCount += result.tokenCount;
      sourceNum++;
    }

    const citations = this.buildCitations(orderedResults);

    this.logger.log(
      `RAG with guardrails: agent=${agentId} results=${results.length} maxSim=${(maxSimilarity * 100).toFixed(1)}% tokens=${contextTokenCount} retrieval=${retrievalMs}ms`,
    );

    return {
      results: orderedResults,
      citations,
      context: context.trim(),
      contextTokenCount,
      guardrail: { outcome: 'answered' },
      retrievalMs,
    };
  }

  /**
   * Build a descriptive source label for context
   */
  private buildSourceLabel(result: SearchResult, sourceNum: number): string {
    const parts: string[] = [];

    // Document name
    const docName =
      result.documentName || result.metadata?.documentTitle || 'Document';
    parts.push(docName);

    // Section/heading if available
    if (result.metadata?.heading) {
      parts.push(`§ ${result.metadata.heading}`);
    } else if (result.metadata?.section) {
      parts.push(`§ ${result.metadata.section}`);
    }

    // Content type hint
    if (result.metadata?.contentType) {
      parts.push(`[${result.metadata.contentType}]`);
    }

    // Relevance score
    const relevance = (result.similarity * 100).toFixed(0);

    return `--- [Source #${sourceNum}: ${parts.join(' > ')}] (${relevance}% relevance) ---`;
  }

  /**
   * Build citations from search results with document names
   */
  private buildCitations(results: SearchResult[]): RagCitation[] {
    return results.map((r) => ({
      documentId: r.documentId,
      documentName: r.documentName,
      chunkIndex: r.chunkIndex,
      snippet: r.content.slice(0, 500),
      similarity: r.similarity,
      metadata: r.metadata,
    }));
  }

  /**
   * Get the default IDK message or agent's custom message
   */
  getIdkMessage(agentConfig?: AgentRagConfig): string {
    return agentConfig?.ragIdkMessage || DEFAULT_IDK_MESSAGE;
  }

  /**
   * Clear all RAG cache from Redis
   */
  async clearAllCache(): Promise<void> {
    try {
      await this.cacheManager.reset();
      this.logger.log('All RAG cache cleared from Redis');
    } catch (error) {
      this.logger.warn(`Failed to clear cache: ${error}`);
    }
  }

  /**
   * Clear cache for a specific agent by deleting keys with pattern
   */
  async clearAgentCacheById(agentId: string): Promise<void> {
    try {
      // cache-manager reset clears all - for agent-specific, we need Redis directly
      // For now, reset all cache as a simple solution
      await this.cacheManager.reset();
      this.logger.log(`Cache cleared for agent ${agentId} (full reset)`);
    } catch (error) {
      this.logger.warn(`Failed to clear agent cache: ${error}`);
    }
  }

  /**
   * Clear cache for an agent (legacy method)
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
