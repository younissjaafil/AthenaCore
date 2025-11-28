import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentStatus, DocumentType } from '../entities/document.entity';

export class DocumentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  agentId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  filename: string;

  @ApiProperty()
  originalName: string;

  @ApiProperty({ enum: DocumentType })
  type: DocumentType;

  @ApiProperty()
  mimeType: string;

  @ApiProperty()
  fileSize: number;

  @ApiPropertyOptional()
  s3Url?: string;

  @ApiProperty({ enum: DocumentStatus })
  status: DocumentStatus;

  @ApiProperty()
  chunkCount: number;

  @ApiProperty()
  embeddingCount: number;

  @ApiPropertyOptional()
  characterCount?: number;

  @ApiPropertyOptional()
  wordCount?: number;

  @ApiPropertyOptional()
  pageCount?: number;

  @ApiPropertyOptional()
  errorMessage?: string;

  @ApiPropertyOptional()
  metadata?: {
    title?: string;
    author?: string;
    language?: string;
    tags?: string[];
    description?: string;
    [key: string]: any;
  };

  @ApiPropertyOptional()
  processingStartedAt?: Date;

  @ApiPropertyOptional()
  processingCompletedAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
