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
import { UploadDocumentDto } from './dto/upload-document.dto';
import { DocumentResponseDto } from './dto/document-response.dto';
import {
  Document,
  DocumentStatus,
  DocumentType,
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

  constructor(
    private readonly documentsRepository: DocumentsRepository,
    private readonly agentsRepository: AgentsRepository,
    private readonly s3Service: S3Service,
    @Inject(forwardRef(() => EmbeddingsService))
    private readonly embeddingsService: EmbeddingsService,
  ) {}

  async uploadDocument(
    file: Express.Multer.File,
    userId: string,
    uploadDto: UploadDocumentDto,
  ): Promise<DocumentResponseDto> {
    // Validate file
    this.validateFile(file);

    // Check if agent exists
    const agent = await this.agentsRepository.findById(uploadDto.agentId);
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    // Determine document type
    const docType = this.getDocumentType(file.mimetype, file.originalname);

    // Generate S3 key
    const s3Key = this.s3Service.generateKey(
      `documents/${uploadDto.agentId}`,
      file.originalname,
    );

    // Upload to S3
    const s3Url = await this.s3Service.uploadFile(
      file.buffer,
      s3Key,
      file.mimetype,
    );

    // Create document record
    const document = await this.documentsRepository.create({
      agentId: uploadDto.agentId,
      filename: file.originalname,
      originalFilename: file.originalname,
      fileType: docType,
      fileSize: file.size,
      s3Key,
      s3Url,
      status: DocumentStatus.PROCESSING,
      metadata: {
        title: uploadDto.title,
        description: uploadDto.description,
        ...uploadDto.metadata,
      },
    });

    // Start async processing
    this.processDocumentAsync(document.id).catch((error) => {
      this.logger.error(
        `Document processing failed: ${error.message}`,
        error.stack,
      );
    });

    return this.toResponseDto(document);
  }

  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }

    if (!this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not supported`,
      );
    }
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

  private async extractText(
    buffer: Buffer,
    type: DocumentType,
  ): Promise<string> {
    try {
      switch (type) {
        case DocumentType.PDF: {
          this.logger.log('Extracting text from PDF...');
          const pdfData = await pdfParse(buffer);
          this.logger.log(
            `PDF extracted: ${pdfData.numpages} pages, ${pdfData.text.length} chars`,
          );
          return pdfData.text;
        }

        case DocumentType.DOCX: {
          this.logger.log('Extracting text from DOCX...');
          const docxResult = await mammoth.extractRawText({ buffer });
          return docxResult.value;
        }

        case DocumentType.TXT:
        case DocumentType.MD:
        case DocumentType.HTML:
        case DocumentType.CSV:
        case DocumentType.JSON:
          return buffer.toString('utf-8');

        default:
          return buffer.toString('utf-8');
      }
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

  async deleteDocument(id: string, userId: string): Promise<void> {
    const document = await this.documentsRepository.findById(id);
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Check if user owns the agent (via creator relationship)
    // findById already includes creator relation
    const agent = await this.agentsRepository.findById(document.agentId);
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    // Check if the agent's creator belongs to this user
    if (!agent.creator || agent.creator.userId !== userId) {
      throw new ForbiddenException(
        'You can only delete documents from your own agents',
      );
    }

    // Delete from S3
    try {
      await this.s3Service.deleteFile(document.s3Key);
    } catch (error) {
      this.logger.error(`Failed to delete S3 file: ${error}`);
    }

    await this.documentsRepository.delete(id);
  }

  async getAgentStats(agentId: string) {
    return this.documentsRepository.getStatsByAgent(agentId);
  }

  toResponseDto(document: Document): DocumentResponseDto {
    return {
      id: document.id,
      agentId: document.agentId,
      filename: document.filename,
      originalFilename: document.originalFilename,
      fileType: document.fileType,
      fileSize: Number(document.fileSize),
      s3Url: document.s3Url,
      status: document.status,
      chunkCount: document.chunkCount,
      embeddingCount: document.embeddingCount,
      errorMessage: document.errorMessage,
      metadata: document.metadata,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }
}
