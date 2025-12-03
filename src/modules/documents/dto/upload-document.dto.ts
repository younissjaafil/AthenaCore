import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsObject,
  IsBoolean,
  IsEnum,
  IsNumber,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  DocumentOwnerType,
  DocumentVisibility,
  DocumentPricingType,
} from '../entities/document.entity';

/**
 * Unified document upload DTO
 * Supports both agent training docs and creator profile content
 */
export class UnifiedUploadDocumentDto {
  // ===== OWNERSHIP =====
  @ApiProperty({
    enum: DocumentOwnerType,
    description: 'Who owns this document',
    example: DocumentOwnerType.CREATOR,
  })
  @IsEnum(DocumentOwnerType)
  ownerType: DocumentOwnerType;

  @ApiProperty({
    description:
      'Owner ID - creator_id for CREATOR type, agent_id for AGENT type',
  })
  @IsUUID()
  ownerId: string;

  // ===== USAGE FLAGS =====
  @ApiPropertyOptional({
    description: 'Show on profile (for CREATOR type)',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  forProfile?: boolean;

  @ApiPropertyOptional({
    description: 'Use for RAG training',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  forRag?: boolean;

  // ===== AGENT ASSOCIATION (for RAG) =====
  @ApiPropertyOptional({
    description: 'Agent ID to attach for RAG (when forRag=true)',
  })
  @IsUUID()
  @IsOptional()
  @ValidateIf((o) => o.forRag === true)
  agentId?: string;

  // ===== VISIBILITY & MONETIZATION =====
  @ApiPropertyOptional({
    enum: DocumentVisibility,
    description: 'Who can see this document',
    default: DocumentVisibility.PRIVATE,
  })
  @IsEnum(DocumentVisibility)
  @IsOptional()
  visibility?: DocumentVisibility;

  @ApiPropertyOptional({
    enum: DocumentPricingType,
    description: 'How is this document monetized',
    default: DocumentPricingType.FREE,
  })
  @IsEnum(DocumentPricingType)
  @IsOptional()
  pricingType?: DocumentPricingType;

  @ApiPropertyOptional({
    description: 'Price in cents (for ONE_TIME pricing)',
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @ValidateIf((o) => o.pricingType === DocumentPricingType.ONE_TIME)
  priceCents?: number;

  @ApiPropertyOptional({
    description: 'Currency code',
    default: 'USD',
  })
  @IsString()
  @IsOptional()
  currency?: string;

  // ===== METADATA =====
  @ApiPropertyOptional({ description: 'Document title' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Document description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

/**
 * Legacy upload DTO for backwards compatibility with existing agent uploads
 */
export class UploadDocumentDto {
  @ApiProperty({ description: 'Agent ID to associate document with' })
  @IsUUID()
  agentId: string;

  @ApiPropertyOptional({ description: 'Document title' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Document description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    enum: DocumentVisibility,
    description: 'Who can see this document',
    default: DocumentVisibility.PRIVATE,
  })
  @IsEnum(DocumentVisibility)
  @IsOptional()
  visibility?: DocumentVisibility;

  @ApiPropertyOptional({
    description: 'Additional metadata',
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
