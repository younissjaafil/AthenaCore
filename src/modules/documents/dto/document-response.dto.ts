import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DocumentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  agentId: string;

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

  @ApiProperty()
  status: string;

  @ApiProperty()
  chunkCount: number;

  @ApiProperty()
  embeddingCount: number;

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

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
