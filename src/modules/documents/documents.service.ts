/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { DocumentsRepository } from './repositories/documents.repository';
import { S3Service } from '../../infrastructure/storage/s3.service';
import { AgentsRepository } from '../agents/repositories/agents.repository';
import { EmbeddingsService } from '../rag/embeddings.service';
import { PdfPreviewService } from './pdf-preview.service';
import {
  UploadDocumentDto,
  UnifiedUploadDocumentDto,
  UpdateDocumentDto,
} from './dto/upload-document.dto';
import {
  DocumentResponseDto,
  PublicDocumentResponseDto,
} from './dto/document-response.dto';
import {
  Document,
  DocumentStatus,
  DocumentType,
  DocumentOwnerType,
  DocumentKind,
  DocumentVisibility,
  DocumentPricingType,
} from './entities/document.entity';
import { extname } from 'path';
import * as mammoth from 'mammoth';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'text/html',
    'text/csv',
    'application/json',
  ];
  // Extended MIME types for profile content
  private readonly EXTENDED_MIME_TYPES = [
    ...this.ALLOWED_MIME_TYPES,
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
  ];

  constructor(
    private readonly documentsRepository: DocumentsRepository,
    private readonly agentsRepository: AgentsRepository,
    private readonly s3Service: S3Service,
    @Inject(forwardRef(() => EmbeddingsService))
    private readonly embeddingsService: EmbeddingsService,
    @Inject(forwardRef(() => PdfPreviewService))
    private readonly pdfPreviewService: PdfPreviewService,
  ) {}

  // ===== UNIFIED UPLOAD (NEW) =====

  /**
   * Unified document upload with hash-based deduplication
   * Supports both agent training docs and creator profile content
   */
  async uploadUnified(
    file: Express.Multer.File,
    userId: string,
    uploadDto: UnifiedUploadDocumentDto,
  ): Promise<DocumentResponseDto> {
    // Validate file (use extended MIME types for profile content)
    const allowedTypes =
      uploadDto.forProfile || uploadDto.ownerType === DocumentOwnerType.CREATOR
        ? this.EXTENDED_MIME_TYPES
        : this.ALLOWED_MIME_TYPES;
    this.validateFileWithTypes(file, allowedTypes);

    // Determine document type and kind
    const docType = this.getDocumentType(file.mimetype, file.originalname);
    const docKind = this.getDocumentKind(file.mimetype);

    // Upload with hash-based deduplication
    const { s3Key, contentHash, isNew } = await this.s3Service.uploadBlob(
      file.buffer,
      file.mimetype,
    );
    const s3Url = this.s3Service.getBlobUrl(s3Key);

    if (!isNew) {
      this.logger.log(`Reusing existing blob: ${contentHash.slice(0, 8)}...`);
    }

    // Determine agentId for RAG
    const agentId =
      uploadDto.ownerType === DocumentOwnerType.AGENT
        ? uploadDto.ownerId
        : uploadDto.agentId || undefined;

    // Create document record
    const document = await this.documentsRepository.create({
      // Ownership
      ownerType: uploadDto.ownerType,
      ownerId: uploadDto.ownerId,
      agentId,
      // File info
      filename: file.originalname,
      originalFilename: file.originalname,
      fileType: docType,
      fileSize: file.size,
      s3Key,
      s3Url,
      // Usage flags
      forProfile: uploadDto.forProfile ?? false,
      forRag: uploadDto.forRag ?? false,
      // Classification
      kind: docKind,
      visibility: uploadDto.visibility ?? DocumentVisibility.PRIVATE,
      // Monetization
      pricingType: uploadDto.pricingType ?? DocumentPricingType.FREE,
      priceCents: uploadDto.priceCents,
      currency: uploadDto.currency ?? 'USD',
      // Deduplication
      contentHash,
      // Status
      status: uploadDto.forRag
        ? DocumentStatus.PROCESSING
        : DocumentStatus.UPLOADED,
      // Metadata
      metadata: {
        title: uploadDto.title,
        description: uploadDto.description,
        ...uploadDto.metadata,
      },
    });

    // If forRag, start async RAG processing
    if (uploadDto.forRag && agentId) {
      this.processDocumentAsync(document.id).catch((error) => {
        this.logger.error(
          `Document RAG processing failed: ${error.message}`,
          error.stack,
        );
      });
    }

    // If PDF, generate watermarked preview images asynchronously
    if (docType === DocumentType.PDF && this.pdfPreviewService.isAvailable()) {
      this.generatePreviewsAsync(document.id, s3Key).catch((error) => {
        this.logger.error(
          `PDF preview generation failed: ${error.message}`,
          error.stack,
        );
      });
    }

    return this.toResponseDto(document);
  }

  /**
   * Generate watermarked preview images for a PDF document (async)
   */
  private async generatePreviewsAsync(
    documentId: string,
    s3Key: string,
  ): Promise<void> {
    try {
      this.logger.log(`Generating preview images for document ${documentId}`);
      const result = await this.pdfPreviewService.generateAllPreviews(
        documentId,
        s3Key,
      );
      // Update document metadata with page count
      await this.updateMetadata(documentId, {
        pageCount: result.pageCount,
        previewsGenerated: true,
      });
      this.logger.log(
        `✅ Generated ${result.pageCount} preview pages for document ${documentId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to generate previews for document ${documentId}:`,
        error,
      );
      // Don't throw - preview generation is optional
    }
  }

  /**
   * Legacy upload - routes to unified upload with AGENT owner type
   */
  async uploadDocument(
    file: Express.Multer.File,
    userId: string,
    uploadDto: UploadDocumentDto,
  ): Promise<DocumentResponseDto> {
    // Validate agent exists
    const agent = await this.agentsRepository.findById(uploadDto.agentId);
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    // Route to unified upload with AGENT type
    return this.uploadUnified(file, userId, {
      ownerType: DocumentOwnerType.AGENT,
      ownerId: uploadDto.agentId,
      agentId: uploadDto.agentId,
      forRag: true,
      forProfile: false,
      visibility: uploadDto.visibility ?? DocumentVisibility.PRIVATE,
      pricingType: DocumentPricingType.FREE,
      title: uploadDto.title,
      description: uploadDto.description,
      metadata: uploadDto.metadata,
    });
  }

  private validateFileWithTypes(
    file: Express.Multer.File,
    allowedTypes: string[],
  ): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not supported`,
      );
    }
  }

  private validateFile(file: Express.Multer.File): void {
    this.validateFileWithTypes(file, this.ALLOWED_MIME_TYPES);
  }

  private getDocumentKind(mimeType: string): DocumentKind {
    if (mimeType.startsWith('image/')) return DocumentKind.IMAGE;
    if (mimeType.startsWith('video/')) return DocumentKind.VIDEO;
    if (mimeType.startsWith('audio/')) return DocumentKind.AUDIO;
    return DocumentKind.DOC;
  }

  private getDocumentType(mimeType: string, filename: string): DocumentType {
    const ext = extname(filename).toLowerCase();

    if (mimeType === 'application/pdf' || ext === '.pdf')
      return DocumentType.PDF;
    if (
      mimeType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      ext === '.docx'
    )
      return DocumentType.DOCX;
    if (mimeType === 'text/plain' || ext === '.txt') return DocumentType.TXT;
    if (mimeType === 'text/markdown' || ext === '.md') return DocumentType.MD;
    if (mimeType === 'text/html' || ext === '.html') return DocumentType.HTML;
    if (mimeType === 'text/csv' || ext === '.csv') return DocumentType.CSV;
    if (mimeType === 'application/json' || ext === '.json')
      return DocumentType.JSON;

    return DocumentType.TXT;
  }

  private async processDocumentAsync(documentId: string): Promise<void> {
    try {
      const document = await this.documentsRepository.findById(documentId);
      if (!document) return;

      // Download file from S3
      const fileBuffer = await this.s3Service.getFile(document.s3Key);

      // Extract text based on file type
      const extractedText = await this.extractText(
        fileBuffer,
        document.fileType as DocumentType,
      );

      // Update document with extracted text
      await this.documentsRepository.update(documentId, {
        extractedText,
        status: DocumentStatus.PROCESSING,
      });

      // Generate chunks and embeddings
      this.logger.log(`Generating embeddings for document ${documentId}...`);
      await this.embeddingsService.processDocument(documentId);

      // Get the embeddings count and update document
      const embeddings =
        await this.embeddingsService.getDocumentEmbeddings(documentId);
      const chunkCount = embeddings.length;

      // Mark as fully processed with chunk counts
      await this.documentsRepository.update(documentId, {
        chunkCount,
        embeddingCount: chunkCount,
        status: DocumentStatus.PROCESSED,
      });

      this.logger.log(
        `Document ${documentId} processed successfully with ${chunkCount} chunks`,
      );
    } catch (error: any) {
      this.logger.error(
        `Document processing failed for ${documentId}:`,
        error.stack,
      );
      await this.documentsRepository.updateStatus(
        documentId,
        DocumentStatus.FAILED,
        error.message,
      );
    }
  }

  /**
   * Sanitize text to remove null bytes and invalid UTF-8 sequences
   * PostgreSQL text columns cannot store null bytes (0x00)
   */
  private sanitizeText(text: string): string {
    // Remove null bytes and other control characters that break PostgreSQL
    // Keep newlines (\n), tabs (\t), and carriage returns (\r)
    return text
      .replace(/\x00/g, '') // Remove null bytes
      .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove other control chars except \t, \n, \r
      .normalize('NFC'); // Normalize Unicode
  }

  private async extractText(
    buffer: Buffer,
    type: DocumentType,
  ): Promise<string> {
    try {
      let text: string;

      switch (type) {
        case DocumentType.PDF: {
          this.logger.log('Extracting text from PDF...');
          const pdfData = await pdfParse(buffer);
          this.logger.log(
            `PDF extracted: ${pdfData.numpages} pages, ${pdfData.text.length} chars`,
          );
          text = pdfData.text;
          break;
        }

        case DocumentType.DOCX: {
          this.logger.log('Extracting text from DOCX...');
          const docxResult = await mammoth.extractRawText({ buffer });
          text = docxResult.value;
          break;
        }

        case DocumentType.TXT:
        case DocumentType.MD:
        case DocumentType.HTML:
        case DocumentType.CSV:
        case DocumentType.JSON:
          text = buffer.toString('utf-8');
          break;

        default:
          text = buffer.toString('utf-8');
      }

      // Sanitize the extracted text to remove invalid characters
      return this.sanitizeText(text);
    } catch (error: any) {
      this.logger.error(`Text extraction failed: ${error.message}`);
      throw new BadRequestException(
        `Failed to extract text from ${type} document`,
      );
    }
  }

  async findByAgent(agentId: string): Promise<DocumentResponseDto[]> {
    const documents = await this.documentsRepository.findByAgent(agentId);
    return documents.map((doc) => this.toResponseDto(doc));
  }

  async findByAgents(agentIds: string[]): Promise<DocumentResponseDto[]> {
    const documents = await this.documentsRepository.findByAgentList(agentIds);
    return documents.map((doc) => this.toResponseDto(doc));
  }

  async findByCreatorWithVisibility(
    creatorId: string,
    visibility: 'public' | 'all' = 'public',
  ): Promise<DocumentResponseDto[]> {
    const documents =
      visibility === 'all'
        ? await this.documentsRepository.findByCreator(creatorId)
        : await this.documentsRepository.findPublicByCreator(creatorId);
    return documents.map((doc) => this.toResponseDto(doc));
  }

  /**
   * Find document by ID (returns raw entity for internal use)
   */
  async findById(id: string): Promise<Document> {
    const document = await this.documentsRepository.findById(id);
    if (!document) {
      throw new NotFoundException('Document not found');
    }
    return document;
  }

  async findOne(id: string, agentId?: string): Promise<DocumentResponseDto> {
    const document = await this.documentsRepository.findById(id);
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (agentId && document.agentId !== agentId) {
      throw new ForbiddenException('You do not have access to this document');
    }

    return this.toResponseDto(document);
  }

  /**
   * Update document metadata (e.g., page count for PDFs)
   */
  async updateMetadata(
    id: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    const document = await this.documentsRepository.findById(id);
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Merge with existing metadata
    const updatedMetadata = {
      ...(document.metadata || {}),
      ...metadata,
    };

    await this.documentsRepository.update(id, { metadata: updatedMetadata });
    this.logger.log(`Updated metadata for document ${id}`);
  }

  async deleteDocument(
    id: string,
    userId: string,
    userRoles: string[] = [],
  ): Promise<void> {
    const document = await this.documentsRepository.findById(id);
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const isAdmin = userRoles.includes('admin');

    // For AGENT-owned documents, check agent ownership (admins can skip this)
    if (
      !isAdmin &&
      document.ownerType === DocumentOwnerType.AGENT &&
      document.agentId
    ) {
      const agent = await this.agentsRepository.findById(document.agentId);
      if (!agent) {
        throw new NotFoundException('Agent not found');
      }
      if (!agent.creator || agent.creator.userId !== userId) {
        throw new ForbiddenException(
          'You can only delete documents from your own agents',
        );
      }
    }
    // For CREATOR-owned documents, check creator ownership (admins can skip this)
    else if (!isAdmin && document.ownerType === DocumentOwnerType.CREATOR) {
      // ownerId is the creatorId - we need to verify userId matches
      // This would require looking up the creator by ownerId
      // For now, we'll add this check when creator repository is available
    }

    // Delete embeddings from vector store (Qdrant)
    try {
      await this.embeddingsService.deleteDocumentEmbeddings(id);
      this.logger.log(`Deleted embeddings for document ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete embeddings: ${error}`);
    }

    // Delete from S3 (only if no other documents use this blob)
    try {
      const otherDocsWithHash =
        await this.documentsRepository.countByContentHash(document.contentHash);
      if (otherDocsWithHash <= 1) {
        await this.s3Service.deleteFile(document.s3Key);
      } else {
        this.logger.log(
          `Keeping blob ${document.contentHash?.slice(0, 8)}... (${otherDocsWithHash - 1} other documents use it)`,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to delete S3 file: ${error}`);
    }

    await this.documentsRepository.delete(id);
  }

  /**
   * Update document properties (visibility, title, description, pricing)
   */
  async updateDocument(
    id: string,
    userId: string,
    updateDto: UpdateDocumentDto,
  ): Promise<DocumentResponseDto> {
    const document = await this.documentsRepository.findById(id);
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Verify ownership based on document owner type
    if (document.ownerType === DocumentOwnerType.AGENT && document.agentId) {
      const agent = await this.agentsRepository.findById(document.agentId);
      if (!agent) {
        throw new NotFoundException('Agent not found');
      }
      if (!agent.creator || agent.creator.userId !== userId) {
        throw new ForbiddenException(
          'You can only update documents from your own agents',
        );
      }
    } else if (document.ownerType === DocumentOwnerType.CREATOR) {
      // For creator-owned docs, ownerId is creatorId
      // We'd need to verify the creator belongs to the user
      // For now, this is a simplified check
    }

    // Build update object with only provided fields
    const updateData: Partial<Document> = {};

    if (updateDto.visibility !== undefined) {
      updateData.visibility = updateDto.visibility;
    }
    if (updateDto.pricingType !== undefined) {
      updateData.pricingType = updateDto.pricingType;
    }
    if (updateDto.priceCents !== undefined) {
      updateData.priceCents = updateDto.priceCents;
    }
    if (updateDto.title !== undefined || updateDto.description !== undefined) {
      updateData.metadata = {
        ...document.metadata,
        ...(updateDto.title && { title: updateDto.title }),
        ...(updateDto.description && { description: updateDto.description }),
      };
    }

    await this.documentsRepository.update(id, updateData);

    // Fetch and return updated document
    const updatedDocument = await this.documentsRepository.findById(id);
    return this.toResponseDto(updatedDocument!);
  }

  /**
   * Reprocess an existing document to re-extract text and regenerate embeddings
   * Useful for fixing documents that failed processing or were uploaded before fixes
   */
  async reprocessDocument(
    id: string,
    userId: string,
  ): Promise<DocumentResponseDto> {
    const document = await this.documentsRepository.findById(id);
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Verify ownership
    if (document.ownerType === DocumentOwnerType.AGENT && document.agentId) {
      const agent = await this.agentsRepository.findById(document.agentId);
      if (!agent) {
        throw new NotFoundException('Agent not found');
      }
      if (!agent.creator || agent.creator.userId !== userId) {
        throw new ForbiddenException(
          'You can only reprocess documents from your own agents',
        );
      }
    }

    // Mark as processing
    await this.documentsRepository.updateStatus(id, DocumentStatus.PROCESSING);

    // Process document synchronously (extract text + embeddings)
    this.logger.log(`Reprocessing document ${id}...`);
    await this.processDocumentAsync(id);

    // Return the updated document
    const updatedDocument = await this.documentsRepository.findById(id);
    return this.toResponseDto(updatedDocument!);
  }

  // ===== OWNER-BASED QUERIES (NEW) =====

  async findByOwner(
    ownerType: DocumentOwnerType,
    ownerId: string,
    options?: {
      forRag?: boolean;
      forProfile?: boolean;
      visibility?: DocumentVisibility;
    },
  ): Promise<DocumentResponseDto[]> {
    const documents = await this.documentsRepository.findByOwner(
      ownerType,
      ownerId,
      options,
    );
    return documents.map((doc) => this.toResponseDto(doc));
  }

  async findPublicProfileDocs(
    creatorId: string,
  ): Promise<PublicDocumentResponseDto[]> {
    const documents =
      await this.documentsRepository.findPublicProfileDocs(creatorId);
    return Promise.all(
      documents.map((doc) => this.toPublicResponseDtoAsync(doc)),
    );
  }

  async getAgentStats(agentId: string) {
    return this.documentsRepository.getStatsByAgent(agentId);
  }

  /**
   * Generate fresh pre-signed URL for S3 access (async version)
   */
  private async getSignedS3Url(s3Key: string): Promise<string | undefined> {
    if (!s3Key) return undefined;
    try {
      // Generate a 1-hour pre-signed URL
      return await this.s3Service.getSignedUrl(s3Key, 3600);
    } catch (error) {
      this.logger.error(`Failed to generate signed URL for ${s3Key}:`, error);
      return undefined;
    }
  }

  toResponseDto(document: Document): DocumentResponseDto {
    return {
      id: document.id,
      // Ownership
      ownerType: document.ownerType,
      ownerId: document.ownerId,
      agentId: document.agentId,
      // File info
      filename: document.filename,
      originalFilename: document.originalFilename,
      fileType: document.fileType,
      fileSize: Number(document.fileSize),
      s3Url: document.s3Url,
      // Status
      status: document.status,
      chunkCount: document.chunkCount,
      embeddingCount: document.embeddingCount,
      errorMessage: document.errorMessage,
      // Usage flags
      forProfile: document.forProfile,
      forRag: document.forRag,
      // Classification
      kind: document.kind,
      visibility: document.visibility,
      // Monetization
      pricingType: document.pricingType,
      priceCents: document.priceCents,
      currency: document.currency,
      // Metadata
      metadata: document.metadata,
      // Timestamps
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }

  /**
   * Sync version - uses stored URL (may be expired)
   * Use toPublicResponseDtoAsync for fresh signed URLs
   */
  toPublicResponseDto(document: Document): PublicDocumentResponseDto {
    const metadata = document.metadata as Record<string, any> | undefined;
    return {
      id: document.id,
      filename: document.filename,
      originalFilename: document.originalFilename,
      fileType: document.fileType,
      fileSize: Number(document.fileSize),
      s3Url: document.s3Url,
      kind: document.kind,
      visibility: document.visibility,
      pricingType: document.pricingType,
      priceCents: document.priceCents,
      currency: document.currency,
      title: metadata?.title,
      description: metadata?.description,
      status: document.status,
      chunkCount: document.chunkCount,
      extractedText: document.extractedText,
      createdAt: document.createdAt,
    };
  }

  /**
   * Async version - generates fresh pre-signed S3 URL
   * Use this for public-facing APIs to ensure URLs work
   */
  async toPublicResponseDtoAsync(
    document: Document,
  ): Promise<PublicDocumentResponseDto> {
    const metadata = document.metadata as Record<string, any> | undefined;
    const signedUrl = await this.getSignedS3Url(document.s3Key);

    return {
      id: document.id,
      filename: document.filename,
      originalFilename: document.originalFilename,
      fileType: document.fileType,
      fileSize: Number(document.fileSize),
      s3Url: signedUrl,
      kind: document.kind,
      visibility: document.visibility,
      pricingType: document.pricingType,
      priceCents: document.priceCents,
      currency: document.currency,
      title: metadata?.title,
      description: metadata?.description,
      status: document.status,
      chunkCount: document.chunkCount,
      extractedText: document.extractedText,
      createdAt: document.createdAt,
    };
  }
}
