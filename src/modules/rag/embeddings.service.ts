/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { encoding_for_model } from 'tiktoken';
import { EmbeddingsRepository } from './repositories/embeddings.repository';
import { DocumentsRepository } from '../documents/repositories/documents.repository';
import { Document } from '../documents/entities/document.entity';
import { Embedding } from './entities/embedding.entity';
import { SummaryService } from './summary.service';

interface ChunkMetadata {
  heading?: string;
  section?: string;
  pageNumber?: number;
  language?: string;
  keywords?: string[];
  contentType?: string; // 'code' | 'list' | 'table' | 'qa' | 'definition'
  documentTitle?: string;
  hierarchyLevel?: number;
  sectionPath?: string;
  [key: string]: any;
}

interface TextChunk {
  content: string;
  tokenCount: number;
  startPosition: number;
  endPosition: number;
  metadata?: ChunkMetadata;
}

interface HierarchicalChunk extends TextChunk {
  hierarchyLevel: number; // 0 for content, 1-6 for heading levels
  sectionPath?: string; // Breadcrumb path like "Introduction > Background"
  parentChunkId?: string; // Reference to parent section chunk
  position: number; // Ordinal position within document
}

interface DocumentSection {
  level: number; // Heading level (1-6)
  title: string;
  content: string;
  startPos: number;
  endPos: number;
  children: DocumentSection[];
  parent?: DocumentSection;
}

@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);
  private readonly openai: OpenAI;
  private readonly encoder;
  // Semantic chunking: prioritize meaningful boundaries over token counts
  private readonly maxTokensPerChunk = 2000; // Safety limit only (very high) - chunks follow paragraphs/sections
  private readonly minTokensPerChunk = 10; // Safety limit only (very low) - allow meaningful small chunks
  private readonly chunkOverlap = 50; // Minimal overlap (1-2 sentences) for context preservation
  private readonly hierarchicalChunkOverlap = 30; // Minimal overlap for hierarchical (1 sentence)
  private readonly embeddingModel = 'text-embedding-3-large';
  private readonly enableHierarchicalChunking = true; // Feature flag
  private readonly enableMultiVector = true; // Feature flag for multi-vector embeddings
  // Chunking strategy: paragraph-based (one paragraph = one chunk, or group related paragraphs)
  private readonly chunkByParagraphs = true; // Prioritize paragraph boundaries

  constructor(
    private readonly configService: ConfigService,
    private readonly embeddingsRepository: EmbeddingsRepository,
    private readonly documentsRepository: DocumentsRepository,
    private readonly summaryService: SummaryService,
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

    const documentTitle =
      document.originalFilename ||
      document.filename ||
      document.metadata?.title;

    // Check if already processed.
    // IMPORTANT: We must ensure both Postgres rows AND Qdrant vectors exist.
    // If Qdrant upsert failed after saving PG rows, retrying would otherwise be blocked.
    const existingCount =
      await this.embeddingsRepository.countByDocument(documentId);
    if (existingCount > 0) {
      const vectorCount =
        await this.embeddingsRepository.countVectorsByDocument(documentId);

      if (vectorCount === existingCount) {
        this.logger.log(
          `Document ${documentId} already processed (embeddings=${existingCount}, vectors=${vectorCount})`,
        );
        return;
      }

      this.logger.warn(
        `Document ${documentId} has inconsistent RAG state (embeddings=${existingCount}, vectors=${vectorCount}). Reprocessing now.`,
      );
      await this.embeddingsRepository.deleteByDocument(documentId);
    }

    // Chunk the document
    // Include filename/title in metadata so queries that reference the document name can retrieve.
    const chunks = this.enableHierarchicalChunking
      ? this.chunkTextHierarchically(document.extractedText, {
          ...(document.metadata || {}),
          filename: documentTitle,
        })
      : this.chunkText(document.extractedText, {
          ...(document.metadata || {}),
          filename: documentTitle,
        });
    this.logger.log(`Created ${chunks.length} chunks from document`);

    // Validate that we have chunks
    if (chunks.length === 0) {
      this.logger.error(
        `No chunks created for document ${documentId}. Text length: ${document.extractedText.length}`,
      );
      throw new Error(
        `Failed to create chunks from document. The document may have an unsupported format or structure.`,
      );
    }

    // Generate embeddings in batches
    await this.generateEmbeddingsForChunks(
      document.agentId,
      documentId,
      chunks,
      documentTitle,
    );

    this.logger.log(
      `Successfully processed document ${documentId} with ${chunks.length} chunks`,
    );
  }

  /**
   * Chunk text into meaningful segments based on paragraph boundaries
   * Each paragraph becomes its own chunk (unless extremely long)
   */
  private chunkText(text: string, metadata?: any): TextChunk[] {
    const chunks: TextChunk[] = [];

    // Split by paragraphs (double newlines or markdown headers)
    const paragraphs = this.splitIntoParagraphs(text);

    let position = 0;

    for (const paragraph of paragraphs) {
      const paragraphTokens = this.encoder.encode(paragraph);
      const paragraphTokenCount = paragraphTokens.length;
      const trimmedParagraph = paragraph.trim();

      // Skip empty paragraphs
      if (!trimmedParagraph) {
        continue;
      }

      // If paragraph is extremely long (safety check), split by sentences
      if (paragraphTokenCount > this.maxTokensPerChunk) {
        const sentenceChunks = this.splitLongParagraphBySentences(
          paragraph,
          position,
          metadata,
        );
        chunks.push(...sentenceChunks);
        position += paragraphTokenCount;
        continue;
      }

      // Each paragraph becomes its own chunk (meaningful semantic unit)
      // Add minimal overlap from previous chunk if available
      let chunkContent = trimmedParagraph;
      let chunkStartPos = position;
      let chunkTokenCount = paragraphTokenCount;

      // Add overlap from previous chunk if it exists
      if (chunks.length > 0) {
        const prevChunk = chunks[chunks.length - 1];
        const overlapText = this.getOverlapText(prevChunk.content);
        if (overlapText) {
          chunkContent = overlapText + '\n\n' + trimmedParagraph;
          chunkTokenCount = this.encoder.encode(chunkContent).length;
          chunkStartPos = position - this.encoder.encode(overlapText).length;
        }
      }

      chunks.push(
        this.createChunk(
          chunkContent,
          chunkTokenCount,
          chunkStartPos,
          position + paragraphTokenCount,
          metadata,
        ),
      );

      position += paragraphTokenCount;
    }

    return chunks;
  }

  /**
   * Hierarchical chunking: preserves document structure (headings → sections → paragraphs)
   */
  private chunkTextHierarchically(
    text: string,
    documentMetadata?: any,
  ): HierarchicalChunk[] {
    const chunks: HierarchicalChunk[] = [];

    // Parse document structure into hierarchical sections
    const sections = this.parseDocumentHierarchy(text);

    // Process each section hierarchically
    let globalPosition = 0;
    const parentChunkMap = new Map<string, string>(); // section path -> parent chunk ID

    for (const section of sections) {
      const sectionChunks = this.processSectionHierarchically(
        section,
        documentMetadata,
        globalPosition,
        parentChunkMap,
      );

      chunks.push(...sectionChunks);
      globalPosition =
        sectionChunks.length > 0
          ? sectionChunks[sectionChunks.length - 1].endPosition
          : globalPosition;
    }

    // Assign parent chunk IDs after all chunks are created
    this.assignParentChunkIds(chunks, parentChunkMap);

    return chunks;
  }

  /**
   * Parse document into hierarchical sections based on markdown headers
   */
  private parseDocumentHierarchy(text: string): DocumentSection[] {
    const sections: DocumentSection[] = [];
    const lines = text.split('\n');

    let currentSection: DocumentSection | null = null;
    let currentContent: string[] = [];
    let position = 0;
    const sectionStack: DocumentSection[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);

      if (headerMatch) {
        // Save previous section if exists
        if (currentSection) {
          currentSection.content = currentContent.join('\n').trim();
          currentSection.endPos = position;
        }

        const level = headerMatch[1].length;
        const title = headerMatch[2].trim();

        // Pop stack until we find parent level
        while (
          sectionStack.length > 0 &&
          sectionStack[sectionStack.length - 1].level >= level
        ) {
          sectionStack.pop();
        }

        const parent =
          sectionStack.length > 0
            ? sectionStack[sectionStack.length - 1]
            : undefined;

        const newSection: DocumentSection = {
          level,
          title,
          content: '',
          startPos: position,
          endPos: position,
          children: [],
          parent,
        };

        if (parent) {
          parent.children.push(newSection);
        } else {
          sections.push(newSection);
        }

        sectionStack.push(newSection);
        currentSection = newSection;
        currentContent = [];
      } else {
        currentContent.push(line);
      }

      position += this.encoder.encode(line + '\n').length;
    }

    // Save last section
    if (currentSection) {
      currentSection.content = currentContent.join('\n').trim();
      currentSection.endPos = position;
    }

    // If no sections were found (no markdown headers), create a root section with all content
    if (sections.length === 0 && currentContent.length > 0) {
      const allContent = currentContent.join('\n').trim();
      if (allContent) {
        sections.push({
          level: 0,
          title: '',
          content: allContent,
          startPos: 0,
          endPos: position,
          children: [],
        });
      }
    }

    return sections;
  }

  /**
   * Process a section hierarchically, creating chunks with proper metadata
   */
  private processSectionHierarchically(
    section: DocumentSection,
    documentMetadata: any,
    startPosition: number,
    parentChunkMap: Map<string, string>,
  ): HierarchicalChunk[] {
    const chunks: HierarchicalChunk[] = [];
    const sectionPath = this.buildSectionPath(section);

    // If section has a heading, create a heading chunk separately
    let contentStartPosition = startPosition;
    if (section.title) {
      const headingLine = `#${'#'.repeat(section.level - 1)} ${section.title}`;
      const headingTokensOnly = this.encoder.encode(headingLine);

      // Create heading chunk
      const headingChunk: HierarchicalChunk = {
        content: headingLine,
        tokenCount: headingTokensOnly.length,
        startPosition,
        endPosition: startPosition + headingTokensOnly.length,
        hierarchyLevel: section.level,
        sectionPath,
        position: chunks.length,
        metadata: this.extractChunkMetadata(headingLine, {
          ...documentMetadata,
          heading: section.title,
          section: sectionPath,
        }),
      };
      chunks.push(headingChunk);
      parentChunkMap.set(sectionPath, headingChunk.content);
      contentStartPosition = startPosition + headingTokensOnly.length;
    }

    // Process content paragraphs separately (each paragraph = one chunk)
    if (section.content.trim().length > 0) {
      // Process content paragraphs - each paragraph becomes its own chunk
      const paragraphs = this.splitIntoParagraphs(section.content);
      let currentPos = contentStartPosition;

      for (const paragraph of paragraphs) {
          const trimmedParagraph = paragraph.trim();

          // Skip empty paragraphs
          if (!trimmedParagraph) {
            continue;
          }

          const paraTokens = this.encoder.encode(trimmedParagraph);
          const paraTokenCount = paraTokens.length;

          // If paragraph is extremely long (safety check), split by sentences
          if (paraTokenCount > this.maxTokensPerChunk) {
            const sentenceChunks =
              this.splitLongParagraphBySentencesHierarchically(
                trimmedParagraph,
                currentPos,
                sectionPath,
                section.level,
                documentMetadata,
              );
            chunks.push(...sentenceChunks);
            currentPos =
              sentenceChunks.length > 0
                ? sentenceChunks[sentenceChunks.length - 1].endPosition
                : currentPos;
            continue;
          }

          // Each paragraph becomes its own chunk (meaningful semantic unit)
          // Add minimal overlap from previous chunk if available
          let chunkContent = trimmedParagraph;
          let chunkStartPos = currentPos;
          let chunkTokenCount = paraTokenCount;

          // Add overlap from previous chunk if it exists
          if (chunks.length > 0) {
            const prevChunk = chunks[chunks.length - 1];
            const overlapText = this.getOverlapText(prevChunk.content);
            if (overlapText) {
              chunkContent = overlapText + '\n\n' + trimmedParagraph;
              chunkTokenCount = this.encoder.encode(chunkContent).length;
              chunkStartPos =
                currentPos - this.encoder.encode(overlapText).length;
            }
          }

          const newChunk: HierarchicalChunk = {
            content: chunkContent,
            tokenCount: chunkTokenCount,
            startPosition: chunkStartPos,
            endPosition: currentPos + paraTokenCount,
            hierarchyLevel: 0, // Content chunk
            sectionPath,
            position: chunks.length,
            metadata: this.extractChunkMetadata(trimmedParagraph, {
              ...documentMetadata,
              section: sectionPath,
            }),
          };
        chunks.push(newChunk);
        currentPos = newChunk.endPosition;
      }
    }

    // Process child sections recursively
    for (const child of section.children) {
      const childChunks = this.processSectionHierarchically(
        child,
        documentMetadata,
        chunks.length > 0
          ? chunks[chunks.length - 1].endPosition
          : startPosition,
        parentChunkMap,
      );
      chunks.push(...childChunks);
    }

    return chunks;
  }

  /**
   * Build section path breadcrumb
   */
  private buildSectionPath(section: DocumentSection): string {
    const path: string[] = [];
    let current: DocumentSection | undefined = section;

    while (current) {
      path.unshift(current.title);
      current = current.parent;
    }

    return path.join(' > ');
  }

  /**
   * Split long paragraph by sentences (hierarchical version)
   */
  private splitLongParagraphBySentencesHierarchically(
    paragraph: string,
    startPosition: number,
    sectionPath: string,
    hierarchyLevel: number,
    metadata?: any,
  ): HierarchicalChunk[] {
    const chunks: HierarchicalChunk[] = [];
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
        chunks.push({
          content: currentChunk.trim(),
          tokenCount: currentTokenCount,
          startPosition: chunkStartPos,
          endPosition: position,
          hierarchyLevel: 0,
          sectionPath,
          position: chunks.length,
          metadata: this.extractChunkMetadata(currentChunk, metadata),
        });

        // Minimal overlap: last 1-2 sentences
        const overlapSentences = sentences
          .slice(
            Math.max(0, sentences.indexOf(sentence) - 2),
            sentences.indexOf(sentence),
          )
          .join(' ');
        currentChunk = overlapSentences + sentence;
        currentTokenCount = this.encoder.encode(currentChunk).length;
        chunkStartPos = position - this.encoder.encode(overlapSentences).length;
      } else {
        currentChunk += sentence;
        currentTokenCount += sentenceTokenCount;
      }

      position += sentenceTokenCount;
    }

    if (currentChunk.trim()) {
      chunks.push({
        content: currentChunk.trim(),
        tokenCount: currentTokenCount,
        startPosition: chunkStartPos,
        endPosition: position,
        hierarchyLevel: 0,
        sectionPath,
        position: chunks.length,
        metadata: this.extractChunkMetadata(currentChunk, metadata),
      });
    }

    return chunks;
  }

  /**
   * Assign parent chunk IDs to hierarchical chunks
   */
  private assignParentChunkIds(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _chunks: HierarchicalChunk[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _parentChunkMap: Map<string, string>,
  ): void {
    // This will be called after chunks are saved to DB
    // For now, we'll store the section path and assign IDs during embedding creation
  }

  /**
   * Split text into paragraphs, preserving headers
   */
  private splitIntoParagraphs(text: string): string[] {
    // First try: Split by double newlines, markdown headers, or HR markers
    const rawParagraphs = text.split(/\n\n+|(?=^#{1,6}\s)/m);
    const paragraphs = rawParagraphs.map((p) => p.trim()).filter((p) => p.length > 0);
    
    // If we only got 1 paragraph and it's very long, the document likely doesn't have double newlines
    // (common in PDFs). Fall back to splitting by single newlines and grouping into reasonable chunks.
    if (paragraphs.length === 1 && paragraphs[0].length > 1000) {
      this.logger.log('Document has no paragraph breaks, using sentence-based chunking');
      // Split by single newlines and group lines into paragraphs of reasonable size
      const lines = text.split(/\n/).map(l => l.trim()).filter(l => l.length > 0);
      const groupedParagraphs: string[] = [];
      let currentGroup: string[] = [];
      let currentLength = 0;
      const targetLength = 500; // Target ~500 chars per paragraph
      
      for (const line of lines) {
        currentGroup.push(line);
        currentLength += line.length;
        
        // Group lines until we reach target length, then start a new paragraph
        if (currentLength >= targetLength) {
          groupedParagraphs.push(currentGroup.join(' '));
          currentGroup = [];
          currentLength = 0;
        }
      }
      
      // Add remaining lines
      if (currentGroup.length > 0) {
        groupedParagraphs.push(currentGroup.join(' '));
      }
      
      return groupedParagraphs.filter(p => p.length > 0);
    }
    
    return paragraphs;
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

  private sanitizeEmbeddingInput(text: string): string {
    // OpenAI embeddings input must not contain null bytes; also strip other ASCII control chars.
    // Keep \t, \n, \r for readability.
    let out = '';
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (code === 0) continue;
      if (code < 32 && code !== 9 && code !== 10 && code !== 13) continue;
      out += text[i];
    }
    return out;
  }

  /**
   * Generate embeddings for chunks using OpenAI
   */
  private async generateEmbeddingsForChunks(
    agentId: string,
    documentId: string,
    chunks: (TextChunk | HierarchicalChunk)[],
    documentTitle?: string,
  ): Promise<void> {
    const batchSize = 100; // OpenAI allows up to 2048 inputs per request

    const titlePrefix = documentTitle ? `Document: ${documentTitle}\n\n` : '';

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

        // Generate summaries for multi-vector approach
        let summaries: string[] = [];
        if (this.enableMultiVector) {
          try {
            summaries = await this.summaryService.generateSummariesBatch(
              validChunks.map((chunk) => chunk.content),
            );
          } catch (error: any) {
            this.logger.warn(
              `Failed to generate summaries for batch ${i / batchSize + 1}: ${error.message}. Continuing with raw embeddings only.`,
            );
            summaries = validChunks.map((chunk) => chunk.content); // Fallback to original
          }
        } else {
          summaries = validChunks.map((chunk) => chunk.content);
        }

        // Sanitize inputs: remove null bytes and control characters
        const sanitizedRawInputs = validChunks.map((chunk) => {
          const contentForEmbedding = `${titlePrefix}${chunk.content}`;
          return this.sanitizeEmbeddingInput(contentForEmbedding);
        });

        const sanitizedSummaryInputs = summaries.map((summary, summaryIdx) => {
          const summaryForEmbedding =
            this.enableMultiVector &&
            summary !== validChunks[summaryIdx]?.content
              ? `${titlePrefix}${summary}`
              : sanitizedRawInputs[summaryIdx];
          return this.sanitizeEmbeddingInput(summaryForEmbedding);
        });

        // Generate raw embeddings
        const rawResponse = await this.openai.embeddings.create({
          model: this.embeddingModel,
          input: sanitizedRawInputs,
          encoding_format: 'float',
        });

        // Generate summary embeddings (use raw if summaries failed)
        const summaryResponse = await this.openai.embeddings.create({
          model: this.embeddingModel,
          input: sanitizedSummaryInputs,
          encoding_format: 'float',
        });

        // Save to database (use original chunks for indices)
        const embeddingsData = validChunks.map((chunk, idx) => {
          const isHierarchical = 'hierarchyLevel' in chunk;
          const hierarchicalChunk: HierarchicalChunk | null = isHierarchical
            ? chunk
            : null;

          return {
            agentId,
            documentId,
            chunkIndex: i + batch.indexOf(chunk),
            content: chunk.content,
            tokenCount: chunk.tokenCount,
            startPosition: chunk.startPosition,
            endPosition: chunk.endPosition,
            vector: rawResponse.data[idx].embedding, // Raw embedding
            summaryVector: summaryResponse.data[idx].embedding, // Summary embedding
            model: this.embeddingModel,
            metadata: {
              ...chunk.metadata,
              hierarchyLevel: hierarchicalChunk?.hierarchyLevel,
              sectionPath: hierarchicalChunk?.sectionPath,
            },
            hierarchyLevel: hierarchicalChunk?.hierarchyLevel ?? 0,
            sectionPath: hierarchicalChunk?.sectionPath,
            parentChunkId: undefined, // Will be set after all chunks are saved
          };
        });

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
      const sanitizedQuery = this.sanitizeEmbeddingInput(query).trim();

      const response = await this.openai.embeddings.create({
        model: this.embeddingModel,
        input: sanitizedQuery,
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
