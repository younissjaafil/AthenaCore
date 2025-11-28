import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EmbeddingResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  agentId: string;

  @ApiProperty()
  documentId: string;

  @ApiProperty()
  chunkIndex: number;

  @ApiProperty()
  content: string;

  @ApiProperty()
  tokenCount: number;

  @ApiPropertyOptional()
  similarity?: number;

  @ApiPropertyOptional()
  metadata?: {
    heading?: string;
    section?: string;
    pageNumber?: number;
    language?: string;
    keywords?: string[];
    [key: string]: any;
  };

  @ApiProperty()
  createdAt: Date;
}
