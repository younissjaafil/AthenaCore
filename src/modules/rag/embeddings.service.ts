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
  contentType?: string; // 'code' | 'list' | 'table' | 'qa' | 'definition'
  documentTitle?: string;
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
  // Optimized chunk sizes for better semantic coherence
  private readonly maxTokensPerChunk = 400; // Smaller chunks = more precise retrieval
  private readonly minTokensPerChunk = 100; // Avoid tiny chunks
  private readonly chunkOverlap = 75; // More overlap = better context preservation
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
   * Chunk text into overlapping segments with semantic awareness
   * Uses sentence boundaries and paragraph preservation for better context
   */
  private chunkText(text: string, metadata?: any): TextChunk[] {
    const chunks: TextChunk[] = [];

    // First, split by paragraphs (double newlines or markdown headers)
    const paragraphs = this.splitIntoParagraphs(text);

    let currentChunk = '';
    let currentTokenCount = 0;
    let chunkStartPosition = 0;
    let position = 0;

    for (const paragraph of paragraphs) {
      const paragraphTokens = this.encoder.encode(paragraph);
      const paragraphTokenCount = paragraphTokens.length;

      // If single paragraph exceeds max, split by sentences
      if (paragraphTokenCount > this.maxTokensPerChunk) {
        // Save current chunk if not empty
        if (currentChunk.trim()) {
          chunks.push(
            this.createChunk(
              currentChunk.trim(),
              currentTokenCount,
              chunkStartPosition,
              position,
              metadata,
            ),
          );
        }

        // Split long paragraph by sentences
        const sentenceChunks = this.splitLongParagraphBySentences(
          paragraph,
          position,
          metadata,
        );
        chunks.push(...sentenceChunks);

        position += paragraphTokenCount;
        currentChunk = '';
        currentTokenCount = 0;
        chunkStartPosition = position;
        continue;
      }

      // Check if adding this paragraph would exceed max tokens
      if (currentTokenCount + paragraphTokenCount > this.maxTokensPerChunk) {
        // Save current chunk and start new one
        if (currentChunk.trim()) {
          chunks.push(
            this.createChunk(
              currentChunk.trim(),
              currentTokenCount,
              chunkStartPosition,
              position,
              metadata,
            ),
          );
        }

        // Start new chunk with overlap (include last part of previous chunk)
        const overlapText = this.getOverlapText(currentChunk);
        currentChunk = overlapText + paragraph + '\n\n';
        currentTokenCount = this.encoder.encode(currentChunk).length;
        chunkStartPosition = position - this.encoder.encode(overlapText).length;
      } else {
        // Add paragraph to current chunk
        currentChunk += paragraph + '\n\n';
        currentTokenCount += paragraphTokenCount + 2; // +2 for newlines
      }

      position += paragraphTokenCount;
    }

    // Don't forget the last chunk
    if (currentChunk.trim() && currentTokenCount >= this.minTokensPerChunk) {
      chunks.push(
        this.createChunk(
          currentChunk.trim(),
          currentTokenCount,
          chunkStartPosition,
          position,
          metadata,
        ),
      );
    } else if (currentChunk.trim() && chunks.length > 0) {
      // Append small remaining text to last chunk
      const lastChunk = chunks[chunks.length - 1];
      lastChunk.content += '\n\n' + currentChunk.trim();
      lastChunk.tokenCount += currentTokenCount;
      lastChunk.endPosition = position;
    } else if (currentChunk.trim()) {
      // Edge case: only one small chunk
      chunks.push(
        this.createChunk(
          currentChunk.trim(),
          currentTokenCount,
          chunkStartPosition,
          position,
          metadata,
        ),
      );
    }

    return chunks;
  }

  /**
   * Split text into paragraphs, preserving headers
   */
  private splitIntoParagraphs(text: string): string[] {
    // Split by double newlines, markdown headers, or HR markers
    const rawParagraphs = text.split(/\n\n+|(?=^#{1,6}\s)/m);
    return rawParagraphs.map((p) => p.trim()).filter((p) => p.length > 0);
  }

  /**
   * Split a long paragraph by sentence boundaries
   */
  private splitLongParagraphBySentences(
    paragraph: string,
    startPosition: number,
    metadata?: any,
  ): TextChunk[] {
    const chunks: TextChunk[] = [];
    // Sentence-ending patterns (handles abbreviations better)
    const sentences = paragraph.match(/[^.!?]+[.!?]+[\s]*/g) || [paragraph];

    let currentChunk = '';
    let currentTokenCount = 0;
    let chunkStartPos = startPosition;
    let position = startPosition;

    for (const sentence of sentences) {
      const sentenceTokens = this.encoder.encode(sentence);
      const sentenceTokenCount = sentenceTokens.length;

      if (
        currentTokenCount + sentenceTokenCount > this.maxTokensPerChunk &&
        currentChunk.trim()
      ) {
        chunks.push(
          this.createChunk(
            currentChunk.trim(),
            currentTokenCount,
            chunkStartPos,
            position,
            metadata,
          ),
        );

        currentChunk = sentence;
        currentTokenCount = sentenceTokenCount;
        chunkStartPos = position;
      } else {
        currentChunk += sentence;
        currentTokenCount += sentenceTokenCount;
      }

      position += sentenceTokenCount;
    }

    if (currentChunk.trim()) {
      chunks.push(
        this.createChunk(
          currentChunk.trim(),
          currentTokenCount,
          chunkStartPos,
          position,
          metadata,
        ),
      );
    }

    return chunks;
  }

  /**
   * Get overlap text from the end of a chunk
   */
  private getOverlapText(text: string): string {
    if (!text) return '';
    const tokens = this.encoder.encode(text);
    if (tokens.length <= this.chunkOverlap) return text;

    const overlapTokens = tokens.slice(-this.chunkOverlap);
    const decoded = this.encoder.decode(overlapTokens);
    return new TextDecoder().decode(decoded);
  }

  /**
   * Create a TextChunk object with metadata
   */
  private createChunk(
    content: string,
    tokenCount: number,
    startPosition: number,
    endPosition: number,
    documentMetadata?: any,
  ): TextChunk {
    return {
      content,
      tokenCount,
      startPosition,
      endPosition,
      metadata: this.extractChunkMetadata(content, documentMetadata),
    };
  }

  /**
   * Extract metadata for a chunk (detect headings, sections, semantic tags)
   */
  private extractChunkMetadata(
    chunkText: string,
    documentMetadata?: any,
  ): ChunkMetadata | undefined {
    const metadata: ChunkMetadata = {};

    const lines = chunkText.split('\n').filter((l) => l.trim());

    // Detect heading with multiple patterns
    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      // Markdown headers
      if (firstLine.startsWith('#')) {
        metadata.heading = firstLine.replace(/^#+\s*/, '');
      }
      // All caps headers (like PDF sections)
      else if (
        firstLine === firstLine.toUpperCase() &&
        firstLine.length > 3 &&
        firstLine.length < 80 &&
        !firstLine.match(/^[\d\W]+$/)
      ) {
        metadata.heading = this.toTitleCase(firstLine);
      }
      // Title case headers (common in documents)
      else if (this.looksLikeTitle(firstLine)) {
        metadata.heading = firstLine;
      }
    }

    // Extract section from headings found anywhere in chunk
    const headingMatch = chunkText.match(/^#{1,3}\s+(.+)$/m);
    if (headingMatch && !metadata.heading) {
      metadata.section = headingMatch[1].trim();
    }

    // Detect content type/topic hints
    const contentType = this.detectContentType(chunkText);
    if (contentType) {
      metadata.contentType = contentType;
    }

    // Extract keywords using TF-IDF-like approach
    const stopWords = new Set([
      'that',
      'this',
      'with',
      'from',
      'have',
      'been',
      'were',
      'they',
      'their',
      'which',
      'would',
      'could',
      'should',
      'about',
      'when',
      'what',
      'where',
      'there',
      'these',
      'those',
      'other',
      'some',
      'such',
      'only',
      'also',
      'into',
      'over',
      'your',
      'more',
      'will',
      'than',
      'then',
      'them',
      'very',
      'just',
      'being',
      'here',
    ]);
    const words = chunkText
      .toLowerCase()
      .replace(/[^a-zA-Z\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !stopWords.has(w));

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
      if (!metadata.section && documentMetadata.section) {
        metadata.section = documentMetadata.section;
      }
      metadata.language = documentMetadata.language;
      metadata.documentTitle =
        documentMetadata.filename || documentMetadata.title;
    }

    return Object.keys(metadata).length > 0 ? metadata : undefined;
  }

  /**
   * Convert ALL CAPS text to Title Case
   */
  private toTitleCase(text: string): string {
    return text.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }

  /**
   * Check if text looks like a title/heading
   */
  private looksLikeTitle(text: string): boolean {
    // Short, ends without period, mostly capitalized words
    if (text.length > 100 || text.endsWith('.')) return false;
    const words = text.split(/\s+/);
    if (words.length > 10) return false;
    const capitalizedCount = words.filter((w) => /^[A-Z]/.test(w)).length;
    return capitalizedCount >= words.length * 0.6;
  }

  /**
   * Detect content type from chunk text
   */
  private detectContentType(text: string): string | undefined {
    const lowerText = text.toLowerCase();

    // Code detection
    if (
      text.match(
        /```|function\s|const\s|import\s|class\s|def\s|if\s*\(|for\s*\(/,
      )
    ) {
      return 'code';
    }
    // List detection
    if (text.match(/^\s*[-•*]\s/m) || text.match(/^\s*\d+\.\s/m)) {
      return 'list';
    }
    // Table detection
    if (text.match(/\|.*\|.*\|/)) {
      return 'table';
    }
    // Q&A / FAQ detection
    if (
      lowerText.includes('question:') ||
      lowerText.includes('answer:') ||
      text.match(/^Q:\s|^A:\s/m)
    ) {
      return 'qa';
    }
    // Definition detection
    if (lowerText.match(/\bis defined as\b|\brefers to\b|\bmeans that\b/)) {
      return 'definition';
    }

    return undefined;
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
