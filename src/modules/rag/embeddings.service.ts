/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { encoding_for_model } from 'tiktoken';
import { EmbeddingsRepository } from './repositories/embeddings.repository';
import { DocumentsRepository } from '../documents/repositories/documents.repository';
import { Document } from '../documents/entities/document.entity';
import { Embedding } from './entities/embedding.entity';

interface ChunkMetadata {
  heading?: string;
  section?: string;
  pageNumber?: number;
  language?: string;
  keywords?: string[];
  [key: string]: any;
}

interface TextChunk {
  content: string;
  tokenCount: number;
  startPosition: number;
  endPosition: number;
  metadata?: ChunkMetadata;
}

@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);
  private readonly openai: OpenAI;
  private readonly encoder;
  private readonly maxTokensPerChunk = 512; // Optimal for text-embedding-3-small
  private readonly chunkOverlap = 50; // Token overlap between chunks
  private readonly embeddingModel = 'text-embedding-3-small';

  constructor(
    private readonly configService: ConfigService,
    private readonly embeddingsRepository: EmbeddingsRepository,
    private readonly documentsRepository: DocumentsRepository,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY not configured');
    }
    this.openai = new OpenAI({ apiKey });
    this.encoder = encoding_for_model('text-embedding-3-small');
  }

  /**
   * Process a document: chunk it and generate embeddings
   */
  async processDocument(documentId: string): Promise<void> {
    this.logger.log(`Processing document ${documentId} for embeddings`);

    const document = await this.documentsRepository.findById(documentId);
    if (!document) {
      throw new Error(`Document ${documentId} not found`);
    }

    if (!document.extractedText) {
      throw new Error(`Document ${documentId} has no extracted text`);
    }

    // Check if already processed
    const existingCount =
      await this.embeddingsRepository.countByDocument(documentId);
    if (existingCount > 0) {
      this.logger.warn(
        `Document ${documentId} already has ${existingCount} embeddings`,
      );
      return;
    }

    // Chunk the document
    const chunks = this.chunkText(document.extractedText, document.metadata);
    this.logger.log(`Created ${chunks.length} chunks from document`);

    // Generate embeddings in batches
    await this.generateEmbeddingsForChunks(
      document.agentId,
      documentId,
      chunks,
    );

    this.logger.log(
      `Successfully processed document ${documentId} with ${chunks.length} chunks`,
    );
  }

  /**
   * Chunk text into overlapping segments
   */
  private chunkText(text: string, metadata?: any): TextChunk[] {
    const chunks: TextChunk[] = [];
    const tokens = this.encoder.encode(text);
    let position = 0;

    while (position < tokens.length) {
      const chunkTokens = tokens.slice(
        position,
        position + this.maxTokensPerChunk,
      );
      // decode returns Uint8Array, convert to string
      const decoded = this.encoder.decode(chunkTokens);
      const chunkText = new TextDecoder().decode(decoded);

      chunks.push({
        content: chunkText.trim(),
        tokenCount: chunkTokens.length,
        startPosition: position,
        endPosition: position + chunkTokens.length,
        metadata: this.extractChunkMetadata(chunkText, metadata),
      });

      // Move forward with overlap
      position += this.maxTokensPerChunk - this.chunkOverlap;
    }

    return chunks;
  }

  /**
   * Extract metadata for a chunk (detect headings, sections, etc.)
   */
  private extractChunkMetadata(
    chunkText: string,
    documentMetadata?: any,
  ): ChunkMetadata | undefined {
    const metadata: ChunkMetadata = {};

    // Detect heading (line starting with # or all caps short line)
    const lines = chunkText.split('\n').filter((l) => l.trim());
    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      if (
        firstLine.startsWith('#') ||
        (firstLine === firstLine.toUpperCase() && firstLine.length < 50)
      ) {
        metadata.heading = firstLine.replace(/^#+\s*/, '');
      }
    }

    // Extract simple keywords (words appearing multiple times)
    const words = chunkText.toLowerCase().match(/\b\w{4,}\b/g) || [];
    const wordCounts: Record<string, number> = {};
    words.forEach((word) => {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    });
    metadata.keywords = Object.entries(wordCounts)
      .filter(([, count]) => count >= 2)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);

    // Include document metadata if available
    if (documentMetadata) {
      metadata.pageNumber = documentMetadata.pageNumber;
      metadata.section = documentMetadata.section;
      metadata.language = documentMetadata.language;
    }

    return Object.keys(metadata).length > 0 ? metadata : undefined;
  }

  /**
   * Generate embeddings for chunks using OpenAI
   */
  private async generateEmbeddingsForChunks(
    agentId: string,
    documentId: string,
    chunks: TextChunk[],
  ): Promise<void> {
    const batchSize = 100; // OpenAI allows up to 2048 inputs per request

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      this.logger.log(
        `Processing batch ${i / batchSize + 1}/${Math.ceil(chunks.length / batchSize)}`,
      );

      try {
        // Filter out empty or invalid chunks
        const validChunks = batch.filter(
          (chunk) => chunk.content && chunk.content.trim().length > 0,
        );

        if (validChunks.length === 0) {
          this.logger.warn(
            `Batch ${i / batchSize + 1} has no valid chunks, skipping`,
          );
          continue;
        }

        // Sanitize input: remove null bytes and control characters
        const sanitizedInputs = validChunks.map((chunk) =>
          chunk.content
            .replace(/\x00/g, '')
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ''),
        );

        // Generate embeddings
        const response = await this.openai.embeddings.create({
          model: this.embeddingModel,
          input: sanitizedInputs,
          encoding_format: 'float',
        });

        // Save to database (use original chunks for indices)
        const embeddingsData = validChunks.map((chunk, idx) => ({
          agentId,
          documentId,
          chunkIndex: i + batch.indexOf(chunk),
          content: chunk.content,
          tokenCount: chunk.tokenCount,
          startPosition: chunk.startPosition,
          endPosition: chunk.endPosition,
          vector: response.data[idx].embedding,
          model: this.embeddingModel,
          metadata: chunk.metadata,
        }));

        await this.embeddingsRepository.createBulk(embeddingsData);
      } catch (error: any) {
        this.logger.error(
          `Failed to generate embeddings for batch ${i / batchSize + 1}: ${error.message}`,
        );
        throw error;
      }
    }
  }

  /**
   * Generate embedding for a query string
   */
  async generateQueryEmbedding(query: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.embeddingModel,
        input: query,
        encoding_format: 'float',
      });

      return response.data[0].embedding;
    } catch (error: any) {
      this.logger.error(`Failed to generate query embedding: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete embeddings for a document
   */
  async deleteDocumentEmbeddings(documentId: string): Promise<void> {
    await this.embeddingsRepository.deleteByDocument(documentId);
    this.logger.log(`Deleted embeddings for document ${documentId}`);
  }

  /**
   * Get statistics for an agent's embeddings
   */
  async getAgentStats(agentId: string): Promise<{
    totalEmbeddings: number;
    totalDocuments: number;
    averageChunksPerDoc: number;
    totalTokens: number;
  }> {
    return this.embeddingsRepository.getStats(agentId);
  }

  /**
   * Get embeddings for a document
   */
  async getDocumentEmbeddings(documentId: string): Promise<Embedding[]> {
    return this.embeddingsRepository.findByDocument(documentId);
  }
}
