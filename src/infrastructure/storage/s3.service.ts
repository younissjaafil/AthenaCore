import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '../../config/config.service';
import * as crypto from 'crypto';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;

  constructor(private configService: ConfigService) {
    this.bucketName = this.configService.s3BucketName || '';
    this.region = this.configService.s3Region;

    const accessKey = this.configService.s3AccessKey;
    const secretKey = this.configService.s3SecretKey;

    if (!accessKey || !secretKey) {
      this.logger.warn(
        'S3 credentials not configured. File uploads will fail.',
      );
      this.logger.warn(
        `Access Key present: ${!!accessKey}, Secret Key present: ${!!secretKey}`,
      );
    }

    if (!this.bucketName) {
      this.logger.warn('S3 bucket name not configured.');
    }

    this.logger.log(
      `S3 configured for region: ${this.region}, bucket: ${this.bucketName}`,
    );

    this.s3Client = new S3Client({
      region: this.region,
      credentials:
        accessKey && secretKey
          ? {
              accessKeyId: accessKey,
              secretAccessKey: secretKey,
            }
          : undefined,
    });
  }

  async uploadFile(
    file: Buffer,
    key: string,
    contentType?: string,
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file,
        ContentType: contentType,
      });

      await this.s3Client.send(command);

      const url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
      this.logger.log(`File uploaded successfully: ${key}`);
      return url;
    } catch (error) {
      this.logger.error(`S3 upload failed for key ${key}:`, error);
      throw error;
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`File deleted successfully: ${key}`);
    } catch (error) {
      this.logger.error(`S3 delete failed for key ${key}:`, error);
      throw error;
    }
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      return url;
    } catch (error) {
      this.logger.error(
        `S3 signed URL generation failed for key ${key}:`,
        error,
      );
      throw error;
    }
  }

  async getFile(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const stream = response.Body as any;
      const chunks: Uint8Array[] = [];

      for await (const chunk of stream) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      this.logger.error(`S3 get file failed for key ${key}:`, error);
      throw error;
    }
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  generateKey(prefix: string, filename: string): string {
    const timestamp = Date.now();
    const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${prefix}/${timestamp}-${sanitized}`;
  }

  // ===== CONTENT-ADDRESSED BLOB STORAGE (NEW) =====

  /**
   * Compute SHA-256 hash of file content for deduplication
   */
  computeContentHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Generate a blob key based on content hash
   * Format: blobs/{hash_prefix}/{hash}.{ext}
   * This enables content-addressed storage and deduplication
   */
  generateBlobKey(contentHash: string, mimeType: string): string {
    const ext = this.getExtensionFromMimeType(mimeType);
    const prefix = contentHash.slice(0, 2); // First 2 chars for directory sharding
    return `blobs/${prefix}/${contentHash}.${ext}`;
  }

  /**
   * Get file extension from MIME types
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'application/pdf': 'pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        'docx',
      'application/msword': 'doc',
      'text/plain': 'txt',
      'text/markdown': 'md',
      'text/html': 'html',
      'text/csv': 'csv',
      'application/json': 'json',
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'video/mp4': 'mp4',
      'video/quicktime': 'mov',
      'video/webm': 'webm',
      'audio/mpeg': 'mp3',
      'audio/wav': 'wav',
      'audio/ogg': 'ogg',
    };
    return mimeToExt[mimeType] || 'bin';
  }

  /**
   * Check if a blob already exists in S3 by its content hash
   */
  async blobExists(contentHash: string, mimeType: string): Promise<boolean> {
    const key = this.generateBlobKey(contentHash, mimeType);
    return this.fileExists(key);
  }

  /**
   * Upload a file as a content-addressed blob
   * Returns the S3 key and whether it was a new upload or reused existing
   */
  async uploadBlob(
    buffer: Buffer,
    mimeType: string,
  ): Promise<{ s3Key: string; contentHash: string; isNew: boolean }> {
    const contentHash = this.computeContentHash(buffer);
    const s3Key = this.generateBlobKey(contentHash, mimeType);

    // Check if blob already exists
    const exists = await this.fileExists(s3Key);

    if (exists) {
      this.logger.log(`Blob already exists, reusing: ${s3Key}`);
      return { s3Key, contentHash, isNew: false };
    }

    // Upload new blob
    await this.uploadFile(buffer, s3Key, mimeType);
    this.logger.log(`New blob uploaded: ${s3Key}`);
    return { s3Key, contentHash, isNew: true };
  }

  /**
   * Get the public URL for a blob
   */
  getBlobUrl(s3Key: string): string {
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${s3Key}`;
  }

  /**
   * Upload a buffer directly to S3 (alias for uploadFile with clearer naming)
   */
  async uploadBuffer(
    buffer: Buffer,
    key: string,
    contentType?: string,
  ): Promise<string> {
    return this.uploadFile(buffer, key, contentType);
  }

  /**
   * Get file metadata (used to check if file exists and get properties)
   */
  async getFileMetadata(
    key: string,
  ): Promise<{ contentLength?: number; contentType?: string }> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      return {
        contentLength: response.ContentLength,
        contentType: response.ContentType,
      };
    } catch (error) {
      this.logger.error(`S3 head object failed for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete all files matching a prefix (for deleting document previews, etc.)
   */
  async deleteByPrefix(prefix: string): Promise<number> {
    try {
      // List all objects with the prefix
      const listCommand = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
      });

      const listResponse = await this.s3Client.send(listCommand);
      const contents = listResponse.Contents || [];

      if (contents.length === 0) {
        this.logger.log(`No files found with prefix: ${prefix}`);
        return 0;
      }

      // Delete each object
      let deletedCount = 0;
      for (const obj of contents) {
        if (obj.Key) {
          await this.deleteFile(obj.Key);
          deletedCount++;
        }
      }

      this.logger.log(
        `Deleted ${deletedCount} files with prefix: ${prefix}`,
      );
      return deletedCount;
    } catch (error) {
      this.logger.error(`S3 delete by prefix failed for ${prefix}:`, error);
      throw error;
    }
  }
}
