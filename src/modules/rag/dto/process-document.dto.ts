import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsOptional } from 'class-validator';

export class ProcessDocumentDto {
  @ApiPropertyOptional({ description: 'Document ID to process' })
  @IsUUID()
  @IsOptional()
  documentId?: string;
}
