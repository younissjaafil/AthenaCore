import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { S3Service } from '../../infrastructure/storage/s3.service';
import { DocumentsRepository } from './repositories/documents.repository';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// pdf-poppler types
interface PdfInfo {
  pages: number;
  [key: string]: unknown;
}

interface PdfPoppler {
  info(filePath: string): Promise<PdfInfo>;
  convert(filePath: string, opts: Record<string, unknown>): Promise<void>;
}

const PDF_MIME_TYPE = 'application/pdf';

@Injectable()
export class PdfPreviewService {
  private readonly logger = new Logger(PdfPreviewService.name);
  private pdfPoppler: PdfPoppler | null = null;

  constructor(
    private readonly s3Service: S3Service,
    private readonly documentsRepository: DocumentsRepository,
  ) {
    // Dynamic import for pdf-poppler
    this.initPdfPoppler();
  }

  private initPdfPoppler(): void {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      this.pdfPoppler = require('pdf-poppler') as PdfPoppler;
      this.logger.log('PDF preview enabled (pdf-poppler loaded)');
    } catch {
      // pdf-poppler requires native Poppler binaries which aren't available on Linux/Railway
      // This is expected in production - PDF preview will be disabled gracefully
      this.logger.log('PDF preview disabled (pdf-poppler not installed)');
    }
  }

  /**
   * Get PDF page as image
   * Converts PDF page to PNG and returns as buffer
   */
  async getPageAsImage(
    documentId: string,
    pageNumber: number,
  ): Promise<{ buffer: Buffer; contentType: string }> {
    const document = await this.documentsRepository.findById(documentId);
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.fileType !== PDF_MIME_TYPE) {
      throw new BadRequestException('Only PDF documents support page preview');
    }

    if (!this.pdfPoppler) {
      throw new BadRequestException(
        'PDF preview is not available on this server',
      );
    }

    // Check page bounds
    if (pageNumber < 1) {
      throw new BadRequestException('Page number must be at least 1');
    }

    if (document.pageCount && pageNumber > document.pageCount) {
      throw new BadRequestException(
        `Page ${pageNumber} does not exist. Document has ${document.pageCount} pages.`,
      );
    }

    // Check if cached preview exists in S3
    const previewKey = this.getPreviewKey(documentId, pageNumber);

    try {
      // Try to get cached preview
      const cachedBuffer = await this.s3Service.getFile(previewKey);
      if (cachedBuffer) {
        return { buffer: cachedBuffer, contentType: 'image/png' };
      }
    } catch {
      // Cache miss, generate preview
    }

    // Generate preview
    const previewBuffer = await this.generatePagePreview(
      document.s3Key,
      pageNumber,
    );

    // Cache to S3
    try {
      await this.s3Service.uploadFile(previewBuffer, previewKey, 'image/png');
      this.logger.log(`Cached preview for ${documentId} page ${pageNumber}`);
    } catch (error) {
      this.logger.warn(`Failed to cache preview: ${error}`);
    }

    return { buffer: previewBuffer, contentType: 'image/png' };
  }

  /**
   * Get page count for a PDF document
   */
  async getPageCount(documentId: string): Promise<number> {
    const document = await this.documentsRepository.findById(documentId);
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.fileType !== PDF_MIME_TYPE) {
      throw new BadRequestException('Only PDF documents have pages');
    }

    // Return cached count if available
    if (document.pageCount) {
      return document.pageCount;
    }

    // Calculate and cache
    const pageCount = await this.calculatePageCount(document.s3Key);
    await this.documentsRepository.update(documentId, { pageCount });

    return pageCount;
  }

  /**
   * Calculate page count from PDF
   */
  private async calculatePageCount(s3Key: string): Promise<number> {
    if (!this.pdfPoppler) {
      return 0;
    }

    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `pdf_${Date.now()}.pdf`);

    try {
      // Download PDF from S3
      const buffer = await this.s3Service.getFile(s3Key);
      if (!buffer) {
        throw new Error('Failed to download PDF from S3');
      }
      fs.writeFileSync(tempFile, buffer);

      // Get PDF info
      const info: PdfInfo = await this.pdfPoppler.info(tempFile);
      return info.pages || 0;
    } finally {
      // Cleanup temp file
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }
  }

  /**
   * Generate page preview image from PDF
   */
  private async generatePagePreview(
    s3Key: string,
    pageNumber: number,
  ): Promise<Buffer> {
    if (!this.pdfPoppler) {
      throw new BadRequestException(
        'PDF preview is not available on this server',
      );
    }

    const tempDir = os.tmpdir();
    const tempPdf = path.join(tempDir, `pdf_${Date.now()}.pdf`);
    const outputPrefix = `preview_${Date.now()}`;

    try {
      // Download PDF from S3
      const buffer = await this.s3Service.getFile(s3Key);
      if (!buffer) {
        throw new Error('Failed to download PDF from S3');
      }
      fs.writeFileSync(tempPdf, buffer);

      // Convert specific page to PNG
      const opts = {
        format: 'png',
        out_dir: tempDir,
        out_prefix: outputPrefix,
        page: pageNumber,
        scale: 2048, // High quality
      };

      await this.pdfPoppler.convert(tempPdf, opts);

      // Read the generated image
      // pdf-poppler outputs files as prefix-1.png, prefix-2.png, etc.
      const outputFile = path.join(
        tempDir,
        `${outputPrefix}-${pageNumber}.png`,
      );

      if (!fs.existsSync(outputFile)) {
        throw new Error(`Preview file not generated: ${outputFile}`);
      }

      const imageBuffer = fs.readFileSync(outputFile);

      // Cleanup output file
      fs.unlinkSync(outputFile);

      return imageBuffer;
    } finally {
      // Cleanup temp PDF
      if (fs.existsSync(tempPdf)) {
        fs.unlinkSync(tempPdf);
      }
    }
  }

  /**
   * Generate S3 key for preview image
   */
  private getPreviewKey(documentId: string, pageNumber: number): string {
    return `previews/${documentId}/page-${pageNumber}.png`;
  }

  /**
   * Pre-generate all page previews for a document (background job)
   */
  async pregenerateAllPreviews(documentId: string): Promise<void> {
    const pageCount = await this.getPageCount(documentId);

    for (let page = 1; page <= pageCount; page++) {
      try {
        await this.getPageAsImage(documentId, page);
        this.logger.log(`Generated preview for page ${page}/${pageCount}`);
      } catch (error) {
        this.logger.error(`Failed to generate preview for page ${page}`, error);
      }
    }
  }

  /**
   * Delete all previews for a document
   */
  async deleteDocumentPreviews(documentId: string): Promise<void> {
    try {
      const document = await this.documentsRepository.findById(documentId);
      if (!document || !document.pageCount) return;

      for (let page = 1; page <= document.pageCount; page++) {
        const previewKey = this.getPreviewKey(documentId, page);
        try {
          await this.s3Service.deleteFile(previewKey);
        } catch {
          // Ignore individual delete failures
        }
      }

      this.logger.log(`Deleted all previews for document ${documentId}`);
    } catch (error) {
      this.logger.error(`Failed to delete previews: ${error}`);
    }
  }
}
