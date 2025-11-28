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
} from '@nestjs/common';
import { DocumentsRepository } from './repositories/documents.repository';
import { S3Service } from '../../infrastructure/storage/s3.service';
import { AgentsRepository } from '../agents/repositories/agents.repository';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { DocumentResponseDto } from './dto/document-response.dto';
import {
  Document,
  DocumentStatus,
  DocumentType,
} from './entities/document.entity';
import { extname } from 'path';
import * as mammoth from 'mammoth';

// pdf-parse doesn't have proper ES module exports
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
      userId,
      filename: file.originalname,
      originalName: file.originalname,
      type: docType,
      mimeType: file.mimetype,
      fileSize: file.size,
      s3Key,
      s3Bucket: this.s3Service['bucketName'],
      s3Url,
      status: DocumentStatus.PROCESSING,
      metadata: {
        title: uploadDto.title,
        description: uploadDto.description,
        ...uploadDto.metadata,
      },
    });

    // Increment agent document count
    await this.agentsRepository.incrementDocumentCount(uploadDto.agentId);

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

      // Extract text
      const extractedText = await this.extractText(fileBuffer, document.type);

      // Calculate metrics
      const characterCount = extractedText.length;
      const wordCount = extractedText
        .split(/\s+/)
        .filter((w) => w.length > 0).length;

      // Update document
      await this.documentsRepository.update(documentId, {
        extractedText,
        characterCount,
        wordCount,
        status: DocumentStatus.COMPLETED,
        processingCompletedAt: new Date(),
      });

      this.logger.log(`Document ${documentId} processed successfully`);
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
          const pdfData = await pdfParse(buffer);
          return pdfData.text;
        }

        case DocumentType.DOCX: {
          const docxResult = await mammoth.extractRawText({ buffer });
          return docxResult.value;
        }

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

  async findByUser(userId: string): Promise<DocumentResponseDto[]> {
    const documents = await this.documentsRepository.findByUser(userId);
    return documents.map((doc) => this.toResponseDto(doc));
  }

  async findOne(id: string, userId: string): Promise<DocumentResponseDto> {
    const document = await this.documentsRepository.findById(id);
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.userId !== userId) {
      throw new ForbiddenException('You do not have access to this document');
    }

    return this.toResponseDto(document);
  }

  async deleteDocument(id: string, userId: string): Promise<void> {
    const document = await this.documentsRepository.findById(id);
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.userId !== userId) {
      throw new ForbiddenException('You can only delete your own documents');
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
      userId: document.userId,
      filename: document.filename,
      originalName: document.originalName,
      type: document.type,
      mimeType: document.mimeType,
      fileSize: Number(document.fileSize),
      s3Url: document.s3Url,
      status: document.status,
      chunkCount: document.chunkCount,
      embeddingCount: document.embeddingCount,
      characterCount: document.characterCount,
      wordCount: document.wordCount,
      pageCount: document.pageCount,
      errorMessage: document.errorMessage,
      metadata: document.metadata,
      processingStartedAt: document.processingStartedAt,
      processingCompletedAt: document.processingCompletedAt,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }
}
