import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SearchResult } from './vector-search.service';

export interface RerankedResult extends SearchResult {
  rerankScore: number;
}

@Injectable()
export class RerankerService {
  private readonly logger = new Logger(RerankerService.name);
  private readonly provider: 'cohere' | 'jina' | 'huggingface';
  private readonly apiKey?: string;
  private readonly model: string;
  private readonly baseUrl?: string;

  constructor(private readonly configService: ConfigService) {
    this.provider = (this.configService.get<string>('RERANK_PROVIDER') ||
      'cohere') as 'cohere' | 'jina' | 'huggingface';
    this.apiKey = this.configService.get<string>('RERANK_API_KEY');
    this.model =
      this.configService.get<string>('RERANK_MODEL') || 'rerank-english-v3.0';
    this.baseUrl = this.configService.get<string>('RERANK_BASE_URL');
  }

  /**
   * Rerank search results using cross-encoder model
   */
  async rerank(
    query: string,
    results: SearchResult[],
    topK: number = 6,
  ): Promise<RerankedResult[]> {
    if (results.length === 0) {
      return [];
    }

    // If we have fewer results than topK, return them as-is
    if (results.length <= topK) {
      return results.map((r) => ({
        ...r,
        rerankScore: r.similarity,
      }));
    }

    try {
      switch (this.provider) {
        case 'cohere':
          return this.rerankWithCohere(query, results, topK);
        case 'jina':
          return this.rerankWithJina(query, results, topK);
        case 'huggingface':
          return this.rerankWithHuggingFace(query, results, topK);
        default:
          this.logger.warn(
            `Unknown reranker provider: ${this.provider}, falling back to similarity sort`,
          );
          return results
            .slice(0, topK)
            .map((r) => ({ ...r, rerankScore: r.similarity }));
      }
    } catch (error: any) {
      this.logger.error(`Reranking failed: ${error.message}`);
      // Fallback to similarity-based sorting
      return results
        .slice(0, topK)
        .map((r) => ({ ...r, rerankScore: r.similarity }));
    }
  }

  /**
   * Rerank using Cohere API
   */
  private async rerankWithCohere(
    query: string,
    results: SearchResult[],
    topK: number,
  ): Promise<RerankedResult[]> {
    if (!this.apiKey) {
      throw new Error('RERANK_API_KEY not configured for Cohere');
    }

    const documents = results.map((r) => r.content);

    const response = await fetch('https://api.cohere.ai/v1/rerank', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        query,
        documents,
        top_n: topK,
        return_documents: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Cohere rerank failed: ${error}`);
    }

    const data = await response.json();
    const rerankedIndices = data.results.map((r: any) => r.index);

    return rerankedIndices.map((idx: number) => {
      const originalResult = results[idx];
      const rerankResult = data.results.find((r: any) => r.index === idx);
      return {
        ...originalResult,
        rerankScore: rerankResult?.relevance_score || originalResult.similarity,
      };
    });
  }

  /**
   * Rerank using Jina API
   */
  private async rerankWithJina(
    query: string,
    results: SearchResult[],
    topK: number,
  ): Promise<RerankedResult[]> {
    if (!this.apiKey) {
      throw new Error('RERANK_API_KEY not configured for Jina');
    }

    const documents = results.map((r) => r.content);

    const response = await fetch('https://api.jina.ai/v1/rerank', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model || 'jina-reranker-v1-base-en',
        query,
        documents,
        top_n: topK,
        return_documents: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Jina rerank failed: ${error}`);
    }

    const data = await response.json();
    const rerankedIndices = data.results.map((r: any) => r.index);

    return rerankedIndices.map((idx: number) => {
      const originalResult = results[idx];
      const rerankResult = data.results.find((r: any) => r.index === idx);
      return {
        ...originalResult,
        rerankScore: rerankResult?.score || originalResult.similarity,
      };
    });
  }

  /**
   * Rerank using HuggingFace Inference API
   */
  private async rerankWithHuggingFace(
    query: string,
    results: SearchResult[],
    topK: number,
  ): Promise<RerankedResult[]> {
    if (!this.apiKey) {
      throw new Error('RERANK_API_KEY not configured for HuggingFace');
    }

    const model = this.model || 'cross-encoder/ms-marco-MiniLM-L-6-v2';
    const apiUrl =
      this.baseUrl || `https://api-inference.huggingface.co/models/${model}`;

    // HuggingFace cross-encoder expects pairs
    const pairs = results.map((r) => [query, r.content]);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        inputs: pairs,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HuggingFace rerank failed: ${error}`);
    }

    const scores = await response.json();
    // Scores is an array of relevance scores
    const scoredResults = results.map((r, idx) => ({
      ...r,
      rerankScore: Array.isArray(scores[idx])
        ? scores[idx][0]
        : scores[idx] || r.similarity,
    }));

    // Sort by rerank score descending and take topK
    return scoredResults
      .sort((a, b) => b.rerankScore - a.rerankScore)
      .slice(0, topK);
  }

  /**
   * Check if reranker is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }
}
