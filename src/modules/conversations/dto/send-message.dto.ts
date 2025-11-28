import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({
    description: 'Message content from the user',
    example: 'What are the best practices for React hooks?',
    maxLength: 10000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  content: string;

  @ApiPropertyOptional({
    description: 'Whether to use RAG context for the response (default: true)',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  useRag?: boolean;
}
