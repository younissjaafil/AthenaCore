import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsInt, Min, Max, IsOptional } from 'class-validator';

export class SearchEmbeddingsDto {
  @ApiProperty({ description: 'Search query text' })
  @IsString()
  query: string;

  @ApiProperty({ description: 'Agent ID to search within' })
  @IsUUID()
  agentId: string;

  @ApiPropertyOptional({
    description: 'Number of results to return',
    default: 5,
    minimum: 1,
    maximum: 20,
  })
  @IsInt()
  @Min(1)
  @Max(20)
  @IsOptional()
  limit?: number = 5;

  @ApiPropertyOptional({
    description: 'Minimum similarity threshold (0-1)',
    default: 0.7,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  threshold?: number = 0.7;
}
