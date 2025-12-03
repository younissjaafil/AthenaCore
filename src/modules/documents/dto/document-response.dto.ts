import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  DocumentOwnerType,
  DocumentKind,
  DocumentVisibility,
  DocumentPricingType,
} from '../entities/document.entity';

export class DocumentResponseDto {
  @ApiProperty()
  id: string;

  // ===== OWNERSHIP =====
  @ApiProperty({ enum: DocumentOwnerType })
  ownerType: DocumentOwnerType;

  @ApiProperty()
  ownerId: string;

  @ApiPropertyOptional()
  agentId?: string;

  // ===== FILE INFO =====
  @ApiProperty()
  filename: string;

  @ApiProperty()
  originalFilename: string;

  @ApiProperty()
  fileType: string;

  @ApiProperty()
  fileSize: number;

  @ApiPropertyOptional()
  s3Url?: string;

  // ===== PROCESSING STATUS =====
  @ApiProperty()
  status: string;

  @ApiProperty()
  chunkCount: number;

  @ApiProperty()
  embeddingCount: number;

  @ApiPropertyOptional()
  errorMessage?: string;

  // ===== USAGE FLAGS =====
  @ApiProperty()
  forProfile: boolean;

  @ApiProperty()
  forRag: boolean;

  // ===== CONTENT CLASSIFICATION =====
  @ApiProperty({ enum: DocumentKind })
  kind: DocumentKind;

  @ApiProperty({ enum: DocumentVisibility })
  visibility: DocumentVisibility;

  // ===== MONETIZATION =====
  @ApiProperty({ enum: DocumentPricingType })
  pricingType: DocumentPricingType;

  @ApiPropertyOptional()
  priceCents?: number;

  @ApiProperty()
  currency: string;

  // ===== DEDUPLICATION =====
  @ApiPropertyOptional()
  contentHash?: string;

  // ===== METADATA =====
  @ApiPropertyOptional()
  metadata?: {
    title?: string;
    author?: string;
    language?: string;
    tags?: string[];
    description?: string;
    [key: string]: any;
  };

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

/**
 * Simplified response for public profile listing
 */
export class PublicDocumentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  filename: string;

  @ApiProperty()
  originalFilename: string;

  @ApiProperty()
  fileType: string;

  @ApiProperty()
  fileSize: number;

  @ApiPropertyOptional()
  s3Url?: string;

  @ApiProperty({ enum: DocumentKind })
  kind: DocumentKind;

  @ApiProperty({ enum: DocumentVisibility })
  visibility: DocumentVisibility;

  @ApiProperty({ enum: DocumentPricingType })
  pricingType: DocumentPricingType;

  @ApiPropertyOptional()
  priceCents?: number;

  @ApiProperty()
  currency: string;

  @ApiPropertyOptional()
  title?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  status?: string;

  @ApiPropertyOptional()
  chunkCount?: number;

  @ApiPropertyOptional()
  extractedText?: string;

  @ApiProperty()
  createdAt: Date;
}
