/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Service } from '../../infrastructure/storage/s3.service';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Dynamic imports for optional dependencies
let pdfPoppler: any = null;
let sharp: any = null;

@Injectable()
export class PdfPreviewService {
  private readonly logger = new Logger(PdfPreviewService.name);
  private pdfPopplerAvailable = false;
  private sharpAvailable = false;
  private isConfigEnabled = true;

  constructor(
    private readonly s3Service: S3Service,
    private readonly configService: ConfigService,
  ) {
    this.isConfigEnabled =
      this.configService.get<string>('PDF_PREVIEW_ENABLED', 'true') === 'true';

    void this.initDependencies();
  }

  private async initDependencies(): Promise<void> {
    if (!this.isConfigEnabled) {
      this.logger.log(
        'ℹ️ PDF preview generation disabled by config (PDF_PREVIEW_ENABLED=false)',
      );
      return;
    }

    // Check pdf-poppler
    try {
      pdfPoppler = await import('pdf-poppler');

      // On non-Windows platforms, we need to verify pdftoppm is actually installed
      if (os.platform() !== 'win32') {
        const { exec } = await import('child_process');
        const util = await import('util');
        const execAsync = util.promisify(exec);

        try {
          await execAsync('pdftoppm -v');
          this.pdfPopplerAvailable = true;
          this.logger.log('✅ pdf-poppler loaded and pdftoppm binary found');
        } catch (e) {
          this.logger.warn(
            '⚠️ pdftoppm binary not found in PATH. PDF preview generation disabled.',
          );
          this.logger.warn(
            'To enable: install poppler-utils (apt install poppler-utils, apk add poppler-utils, or brew install poppler)',
          );
          this.pdfPopplerAvailable = false;
        }
      } else {
        // Windows version of pdf-poppler includes binaries
        this.pdfPopplerAvailable = true;
        this.logger.log('✅ pdf-poppler loaded successfully (Windows bundled)');
      }
    } catch (e) {
      this.logger.warn(
        '⚠️ pdf-poppler import failed. PDF preview generation disabled.',
      );
    }

    // Check sharp
    try {
      sharp = (await import('sharp')).default;
      this.sharpAvailable = true;
      this.logger.log('✅ sharp loaded successfully');
    } catch {
      this.logger.warn('⚠️ sharp not available. Watermarking disabled.');
    }
  }

  /**
   * Check if PDF preview generation is available
   */
  isAvailable(): boolean {
    return (
      this.isConfigEnabled && this.pdfPopplerAvailable && this.sharpAvailable
    );
  }

  /**
   * Generate SVG watermark overlay
   * Creates a diagonal "ATHENA • Preview Only" pattern
   */
  private generateWatermarkSvg(width: number, height: number): Buffer {
    const watermarkText = 'ATHENA • Preview Only';
    const fontSize = Math.max(24, Math.floor(width / 20)); // Responsive font size
    const rotation = -30; // Diagonal angle

    // Create a repeating pattern
    const patternSize = Math.floor(fontSize * 8);
    const numCols = Math.ceil(width / patternSize) + 1;
    const numRows = Math.ceil(height / patternSize) + 1;

    let textElements = '';
    for (let row = 0; row < numRows; row++) {
      for (let col = 0; col < numCols; col++) {
        const x = col * patternSize - (row % 2) * (patternSize / 2);
        const y = row * patternSize;
        textElements += `
          <text
            x="${x}"
            y="${y}"
            font-family="Arial, sans-serif"
            font-size="${fontSize}"
            font-weight="bold"
            fill="rgba(128, 128, 128, 0.35)"
            transform="rotate(${rotation} ${x} ${y})"
          >${watermarkText}</text>
        `;
      }
    }

    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <style>
            text {
              user-select: none;
              pointer-events: none;
            }
          </style>
        </defs>
        ${textElements}
      </svg>
    `;

    return Buffer.from(svg);
  }

  /**
   * Add watermark to an image using Sharp
   */
  private async addWatermark(imagePath: string): Promise<Buffer> {
    if (!sharp) {
      throw new Error('Sharp not available for watermarking');
    }

    const image = sharp(imagePath);
    const metadata = await image.metadata();
    const width = (metadata.width as number) || 800;
    const height = (metadata.height as number) || 1100;

    // Generate watermark overlay
    const watermarkSvg = this.generateWatermarkSvg(width, height);

    // Composite watermark on top of image
    const watermarkedImage = await image
      .composite([
        {
          input: watermarkSvg,
          top: 0,
          left: 0,
        },
      ])
      .jpeg({ quality: 85 })
      .toBuffer();

    return watermarkedImage as Buffer;
  }

  /**
   * Generate all preview pages for a PDF document
   * Downloads PDF from S3, converts to images, watermarks, and uploads back to S3
   *
   * @param documentId - The document ID
   * @param s3Key - The S3 key for the original PDF
   * @returns Object with pageCount and preview keys
   */
  async generateAllPreviews(
    documentId: string,
    s3Key: string,
  ): Promise<{ pageCount: number; previewKeys: string[] }> {
    if (!this.isAvailable()) {
      this.logger.warn(
        `PDF preview generation skipped - dependencies not available`,
      );
      return { pageCount: 0, previewKeys: [] };
    }

    const tempDir = path.join(os.tmpdir(), `athena-preview-${documentId}`);
    const pdfPath = path.join(tempDir, 'original.pdf');

    try {
      // Create temp directory
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Download PDF from S3
      this.logger.log(`Downloading PDF from S3: ${s3Key}`);
      const pdfBuffer = await this.s3Service.getFile(s3Key);
      fs.writeFileSync(pdfPath, pdfBuffer);

      // Convert PDF to images using pdf-poppler
      this.logger.log(`Converting PDF to images...`);

      const options = {
        format: 'jpeg',
        out_dir: tempDir,
        out_prefix: 'page',
        page: null, // All pages
        scale: 1500, // Resolution - higher = better quality
      };

      await pdfPoppler.convert(pdfPath, options);

      // Find all generated images
      const files = fs.readdirSync(tempDir);
      const imageFiles = files
        .filter((f) => f.startsWith('page') && f.endsWith('.jpg'))
        .sort((a, b) => {
          // Sort by page number
          const numA = parseInt(a.match(/\d+/)?.[0] || '0');
          const numB = parseInt(b.match(/\d+/)?.[0] || '0');
          return numA - numB;
        });

      this.logger.log(`Found ${imageFiles.length} pages to watermark`);

      // Watermark and upload each page
      const previewKeys: string[] = [];
      for (let i = 0; i < imageFiles.length; i++) {
        const imagePath = path.join(tempDir, imageFiles[i]);
        const pageNum = i + 1;
        const previewKey = `previews/${documentId}/page-${pageNum}.jpg`;

        // Add watermark
        this.logger.log(`Watermarking page ${pageNum}...`);
        const watermarkedBuffer = await this.addWatermark(imagePath);

        // Upload to S3
        this.logger.log(`Uploading preview page ${pageNum} to S3...`);
        await this.s3Service.uploadBuffer(
          watermarkedBuffer,
          previewKey,
          'image/jpeg',
        );

        previewKeys.push(previewKey);
      }

      this.logger.log(
        `✅ Generated ${previewKeys.length} watermarked preview pages for document ${documentId}`,
      );

      return {
        pageCount: previewKeys.length,
        previewKeys,
      };
    } catch (error) {
      this.logger.error(
        `Failed to generate previews for document ${documentId}:`,
        error,
      );
      throw error;
    } finally {
      // Cleanup temp files
      try {
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      } catch {
        this.logger.warn(`Failed to cleanup temp dir: ${tempDir}`);
      }
    }
  }

  /**
   * Get a signed URL for a specific preview page
   *
   * @param documentId - The document ID
   * @param pageNumber - The page number (1-indexed)
   * @param expiresIn - URL expiry in seconds (default 15 minutes)
   * @returns Signed URL for the preview image
   */
  async getPreviewSignedUrl(
    documentId: string,
    pageNumber: number,
    expiresIn = 900, // 15 minutes - short for security
  ): Promise<string> {
    const previewKey = `previews/${documentId}/page-${pageNumber}.jpg`;
    return this.s3Service.getSignedUrl(previewKey, expiresIn);
  }

  /**
   * Check if previews exist for a document
   */
  async hasPreviewsGenerated(documentId: string): Promise<boolean> {
    try {
      const previewKey = `previews/${documentId}/page-1.jpg`;
      // Try to get metadata - if it exists, previews are generated
      await this.s3Service.getFileMetadata(previewKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete all previews for a document
   */
  async deletePreviews(documentId: string): Promise<void> {
    try {
      // List and delete all preview files for this document
      const prefix = `previews/${documentId}/`;
      await this.s3Service.deleteByPrefix(prefix);
      this.logger.log(`Deleted all previews for document ${documentId}`);
    } catch (error) {
      this.logger.warn(
        `Failed to delete previews for document ${documentId}:`,
        error,
      );
    }
  }
}
