import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BM25Service, BM25SearchResult } from './bm25.service';
import { EmbeddingsRepository } from './repositories/embeddings.repository';
import { EmbeddingsService } from './embeddings.service';
import { SearchResult } from './vector-search.service';

export interface HybridSearchResult extends SearchResult {
  bm25Score?: number;
  retrievalMethod: 'vector' | 'bm25' | 'hybrid';
}

@Injectable()
export class HybridSearchService {
  private readonly logger = new Logger(HybridSearchService.name);
  private readonly rrfK: number = 60; // RRF constant
  private readonly bm25Weight: number;
  private readonly vectorWeight: number;

  constructor(
    private readonly bm25Service: BM25Service,
    private readonly embeddingsRepository: EmbeddingsRepository,
    private readonly embeddingsService: EmbeddingsService,
    private readonly configService: ConfigService,
  ) {
    this.bm25Weight = parseFloat(
      this.configService.get<string>('HYBRID_BM25_WEIGHT') || '0.3',
    );
    this.vectorWeight = parseFloat(
      this.configService.get<string>('HYBRID_VECTOR_WEIGHT') || '0.7',
    );
  }

  /**
   * Perform hybrid search: BM25 + Vector (raw + summary) with RRF
   */
  async hybridSearch(
    agentId: string,
    query: string,
    limit: number = 20,
    threshold: number = 0.6,
  ): Promise<HybridSearchResult[]> {
    const t0 = Date.now();

    // Run all three searches in parallel
    const [bm25Results, rawVectorResults, summaryVectorResults] =
      await Promise.all([
        this.bm25Service.search(agentId, query, limit),
        this.searchVectors(agentId, query, limit, threshold, 'raw'),
        this.searchVectors(agentId, query, limit, threshold, 'summary'),
      ]);

    this.logger.log(
      `Hybrid search: BM25=${bm25Results.length}, Raw=${rawVectorResults.length}, Summary=${summaryVectorResults.length}`,
    );

    // Merge results using Reciprocal Rank Fusion (RRF)
    const mergedResults = this.mergeWithRRF(
      bm25Results,
      rawVectorResults,
      summaryVectorResults,
      limit,
    );

    const elapsed = Date.now() - t0;
    this.logger.log(
      `Hybrid search completed in ${elapsed}ms, returning ${mergedResults.length} results`,
    );

    return mergedResults;
  }

  /**
   * Search vectors using Qdrant
   */
  private async searchVectors(
    agentId: string,
    query: string,
    limit: number,
    threshold: number,
    vectorName: 'raw' | 'summary',
  ): Promise<SearchResult[]> {
    try {
      const queryVector =
        await this.embeddingsService.generateQueryEmbedding(query);

      const results =
        await this.embeddingsRepository.similaritySearchWithVectorName(
          agentId,
          queryVector,
          limit,
          threshold,
          vectorName,
        );

      return results.map((r) => ({
        id: r.embedding.id,
        agentId: r.embedding.agentId,
        documentId: r.embedding.documentId,
        documentName:
          r.embedding.document?.filename ||
          (r.embedding.metadata as { documentTitle?: string })?.documentTitle ||
          `Document ${r.embedding.chunkIndex + 1}`,
        chunkIndex: r.embedding.chunkIndex,
        content: r.embedding.content,
        similarity: r.similarity,
        metadata: r.embedding.metadata,
        tokenCount: r.embedding.tokenCount,
        createdAt: r.embedding.createdAt,
      }));
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Vector search (${vectorName}) failed: ${errorMessage}`,
      );
      return [];
    }
  }

  /**
   * Merge search results using Reciprocal Rank Fusion (RRF)
   * RRF score = sum(1 / (k + rank)) for each result list
   */
  private mergeWithRRF(
    bm25Results: BM25SearchResult[],
    rawVectorResults: SearchResult[],
    summaryVectorResults: SearchResult[],
    limit: number,
  ): HybridSearchResult[] {
    const resultMap = new Map<string, HybridSearchResult>();

    // Add BM25 results with RRF scoring
    bm25Results.forEach((result) => {
      const existing = resultMap.get(result.id);
      if (existing) {
        existing.bm25Score = result.bm25Score;
        // Weighted combination: BM25 contributes to final score
        existing.similarity =
          existing.similarity * this.vectorWeight +
          (result.bm25Score / 10) * this.bm25Weight; // Normalize BM25 score
        existing.retrievalMethod = 'hybrid';
      } else {
        resultMap.set(result.id, {
          id: result.id,
          agentId: result.agentId,
          documentId: result.documentId,
          documentName: undefined,
          chunkIndex: result.chunkIndex,
          content: result.content,
          similarity: (result.bm25Score / 10) * this.bm25Weight, // Normalize BM25
          metadata: result.metadata as Record<string, unknown>,
          tokenCount: 0, // BM25 doesn't provide token count
          createdAt: new Date(),
          bm25Score: result.bm25Score,
          retrievalMethod: 'bm25',
        });
      }
    });

    // Add raw vector results with RRF scoring
    rawVectorResults.forEach((result) => {
      const existing = resultMap.get(result.id);
      if (existing) {
        // Combine scores: existing (BM25) + raw vector
        existing.similarity =
          existing.similarity + result.similarity * this.vectorWeight * 0.6; // Raw gets 60% of vector weight
        existing.retrievalMethod = 'hybrid';
      } else {
        resultMap.set(result.id, {
          ...result,
          similarity: result.similarity * this.vectorWeight * 0.6,
          retrievalMethod: 'vector',
        });
      }
    });

    // Add summary vector results with RRF scoring
    summaryVectorResults.forEach((result) => {
      const existing = resultMap.get(result.id);
      if (existing) {
        // Combine scores: existing + summary vector
        existing.similarity =
          existing.similarity + result.similarity * this.vectorWeight * 0.4; // Summary gets 40% of vector weight
        existing.retrievalMethod = 'hybrid';
      } else {
        resultMap.set(result.id, {
          ...result,
          similarity: result.similarity * this.vectorWeight * 0.4,
          retrievalMethod: 'vector',
        });
      }
    });

    // Sort by combined similarity score and return top results
    const merged = Array.from(resultMap.values())
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return merged;
  }

  /**
   * Get search statistics
   */
  async getStats(agentId: string): Promise<{
    bm25Stats: {
      totalIndexedChunks: number;
      averageChunkLength: number;
    };
  }> {
    const bm25Stats = await this.bm25Service.getStats(agentId);
    return { bm25Stats };
  }
}
