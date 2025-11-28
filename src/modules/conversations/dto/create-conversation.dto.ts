import { IsUUID, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiProperty({
    description: 'ID of the agent to start conversation with',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  agentId: string;

  @ApiPropertyOptional({
    description: 'Optional title for the conversation',
    example: 'Discussion about React best practices',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;
}
