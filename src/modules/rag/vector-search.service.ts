/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
import { Injectable, Logger, Inject } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { EmbeddingsRepository } from './repositories/embeddings.repository';
import { EmbeddingsService } from './embeddings.service';
import { RagCitation } from './entities/rag-query-log.entity';
import { HybridSearchService, HybridSearchResult } from './hybrid-search.service';
import { RerankerService, RerankedResult } from './reranker.service';

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

  private readonly fallbackSearchThreshold = 0.35;
  private readonly hardIdkSimilarityFloor = 0.25;

  private readonly enableHybridSearch = true; // Feature flag

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly embeddingsRepository: EmbeddingsRepository,
    private readonly embeddingsService: EmbeddingsService,
    private readonly hybridSearchService: HybridSearchService,
    private readonly rerankerService: RerankerService,
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
    // IMPORTANT: don't cache empty results.
    // If a user searches before embeddings are processed (or while reprocessing),
    // caching the miss makes RAG look "broken" for up to 1 hour.
    if (searchResults.length > 0) {
      await this.cacheManager.set(cacheKey, searchResults, this.cacheTTL);
    }

    this.logger.log(
      `RAG search: ${searchResults.length} chunks retrieved (threshold=${threshold})`,
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
    let results = await this.search(agentId, query, 10, 0.6);

    // If threshold is too strict for the query, run a second pass with a lower threshold.
    if (results.length === 0) {
      results = await this.search(
        agentId,
        query,
        10,
        this.fallbackSearchThreshold,
      );
    }

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

    // Use hybrid search if enabled, otherwise fall back to vector search
    let hybridResults: HybridSearchResult[] = [];
    let results: SearchResult[] = [];

    if (this.enableHybridSearch) {
      // Perform hybrid search: BM25 + Vector (raw + summary) with RRF
      hybridResults = await this.hybridSearchService.hybridSearch(
        agentId,
        query,
        Math.max(config.ragMaxResults, 20), // Get top 20 for reranking
        config.ragSimilarityThreshold,
      );

      // Convert hybrid results to SearchResult format
      results = hybridResults.map((r) => ({
        id: r.id,
        agentId: r.agentId,
        documentId: r.documentId,
        documentName: r.documentName,
        chunkIndex: r.chunkIndex,
        content: r.content,
        similarity: r.similarity,
        metadata: r.metadata,
        tokenCount: r.tokenCount,
        createdAt: r.createdAt,
      }));
    } else {
      // Fallback to original vector search
      results = await this.search(
        agentId,
        query,
        config.ragMaxResults,
        config.ragSimilarityThreshold,
      );

      // Fallback threshold if no results
      if (
        results.length === 0 &&
        config.ragSimilarityThreshold > this.fallbackSearchThreshold
      ) {
        results = await this.search(
          agentId,
          query,
          config.ragMaxResults,
          this.fallbackSearchThreshold,
        );
      }
    }

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
        // Hard-stop only if similarity is extremely low.
        // Otherwise, allow answering with retrieved context to avoid false "IDK".
        if (maxSimilarity < this.hardIdkSimilarityFloor) {
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
    }

    // Apply semantic reranking if enabled
    let orderedResults: SearchResult[] = results;
    if (config.ragEnableReranking && this.rerankerService.isConfigured()) {
      try {
        // Rerank top 20 → top 6
        const reranked = await this.rerankerService.rerank(
          query,
          results.slice(0, 20), // Rerank top 20
          6, // Return top 6
        );

        // Convert reranked results back to SearchResult format
        orderedResults = reranked.map((r) => ({
          id: r.id,
          agentId: r.agentId,
          documentId: r.documentId,
          documentName: r.documentName,
          chunkIndex: r.chunkIndex,
          content: r.content,
          similarity: r.rerankScore, // Use rerank score
          metadata: r.metadata,
          tokenCount: r.tokenCount,
          createdAt: r.createdAt,
        }));
      } catch (error: any) {
        this.logger.warn(
          `Reranking failed: ${error.message}, falling back to similarity sort`,
        );
        // Fallback to similarity-based sorting
        orderedResults = [...results].sort(
          (a, b) => b.similarity - a.similarity,
        );
      }
    } else if (config.ragEnableReranking) {
      // Reranking enabled but not configured, use similarity sort
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
      guardrail:
        config.ragEnableGuardrails &&
        maxSimilarity < config.ragMinConfidenceThreshold
          ? { outcome: 'answered', reason: 'low_similarity_allow' }
          : { outcome: 'answered' },
      retrievalMs,
    };
  }

  /**
   * Build a descriptive source label for context with hierarchical paths
   */
  private buildSourceLabel(result: SearchResult, sourceNum: number): string {
    const parts: string[] = [];

    // Document name
    const docName =
      result.documentName || result.metadata?.documentTitle || 'Document';
    parts.push(docName);

    // Hierarchical section path (preferred)
    if (result.metadata?.sectionPath) {
      parts.push(result.metadata.sectionPath);
    } else if (result.metadata?.heading) {
      parts.push(`§ ${result.metadata.heading}`);
    } else if (result.metadata?.section) {
      parts.push(`§ ${result.metadata.section}`);
    }

    // Content type hint
    if (result.metadata?.contentType) {
      parts.push(`[${result.metadata.contentType}]`);
    }

    // Relevance score and retrieval method
    const relevance = (result.similarity * 100).toFixed(0);
    const hybridResult = result as any;
    const retrievalMethod = hybridResult.retrievalMethod || 'vector';
    const methodLabel =
      retrievalMethod === 'hybrid'
        ? 'Hybrid'
        : retrievalMethod === 'bm25'
          ? 'BM25'
          : 'Vector';

    // Include BM25 score if available
    const bm25Info =
      hybridResult.bm25Score !== undefined
        ? `, BM25: ${hybridResult.bm25Score.toFixed(2)}`
        : '';

    return `--- [Source #${sourceNum}: ${parts.join(' > ')}] (${relevance}% relevance${bm25Info}, ${methodLabel}) ---`;
  }

  /**
   * Build citations from search results with enhanced metadata
   */
  private buildCitations(results: SearchResult[]): RagCitation[] {
    return results.map((r) => {
      const hybridResult = r as any; // Cast to access hybrid-specific fields
      return {
        documentId: r.documentId,
        documentName: r.documentName,
        chunkIndex: r.chunkIndex,
        snippet: r.content.slice(0, 500),
        similarity: r.similarity,
        metadata: r.metadata,
        // Enhanced citation fields
        sectionPath: r.metadata?.sectionPath || r.metadata?.section,
        hierarchyLevel: r.metadata?.hierarchyLevel,
        bm25Score: hybridResult.bm25Score,
        rerankScore: hybridResult.rerankScore || r.similarity,
        retrievalMethod: hybridResult.retrievalMethod || 'vector',
      };
    });
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
      // cache-manager v5+ uses store.reset() if available, otherwise log warning
      const store = (this.cacheManager as any).store;
      if (store && typeof store.reset === 'function') {
        await store.reset();
        this.logger.log('All RAG cache cleared from Redis');
      } else {
        this.logger.warn('Cache reset not supported by current cache store');
      }
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
      const store = (this.cacheManager as any).store;
      if (store && typeof store.reset === 'function') {
        await store.reset();
        this.logger.log(`Cache cleared for agent ${agentId} (full reset)`);
      } else {
        this.logger.warn(`Cache reset not supported for agent ${agentId}`);
      }
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
