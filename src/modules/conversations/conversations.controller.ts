import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ConversationResponseDto } from './dto/conversation-response.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { ConversationStatus } from './entities/conversation.entity';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';

@ApiTags('Conversations')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new conversation',
    description: 'Start a new conversation with an AI agent',
  })
  @ApiResponse({
    status: 201,
    description: 'Conversation created successfully',
    type: ConversationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  async createConversation(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateConversationDto,
  ): Promise<ConversationResponseDto> {
    return this.conversationsService.createConversation(userId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get user conversations',
    description: 'List all conversations for the current user',
  })
  @ApiQuery({
    name: 'status',
    enum: ConversationStatus,
    required: false,
    description: 'Filter by conversation status',
  })
  @ApiResponse({
    status: 200,
    description: 'Conversations retrieved successfully',
    type: [ConversationResponseDto],
  })
  async getUserConversations(
    @CurrentUser('sub') userId: string,
    @Query('status') status?: ConversationStatus,
  ): Promise<ConversationResponseDto[]> {
    return this.conversationsService.getUserConversations(userId, status);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get conversation details',
    description: 'Get a specific conversation with all messages',
  })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({
    status: 200,
    description: 'Conversation retrieved successfully',
    type: ConversationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async getConversation(
    @CurrentUser('sub') userId: string,
    @Param('id') conversationId: string,
  ): Promise<ConversationResponseDto> {
    return this.conversationsService.getConversation(userId, conversationId);
  }

  @Post(':id/messages')
  @ApiOperation({
    summary: 'Send a message',
    description:
      'Send a message in a conversation and get AI response with RAG',
  })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({
    status: 201,
    description: 'Message sent and AI response received',
    schema: {
      properties: {
        userMessage: { $ref: '#/components/schemas/MessageResponseDto' },
        assistantMessage: { $ref: '#/components/schemas/MessageResponseDto' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async sendMessage(
    @CurrentUser('sub') userId: string,
    @Param('id') conversationId: string,
    @Body() dto: SendMessageDto,
  ): Promise<{
    userMessage: MessageResponseDto;
    assistantMessage: MessageResponseDto;
  }> {
    return this.conversationsService.sendMessage(userId, conversationId, dto);
  }

  @Patch(':id/archive')
  @ApiOperation({
    summary: 'Archive a conversation',
    description: 'Archive a conversation (does not delete messages)',
  })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({
    status: 200,
    description: 'Conversation archived successfully',
  })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async archiveConversation(
    @CurrentUser('sub') userId: string,
    @Param('id') conversationId: string,
  ): Promise<{ message: string }> {
    await this.conversationsService.archiveConversation(userId, conversationId);
    return { message: 'Conversation archived successfully' };
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a conversation',
    description: 'Permanently delete a conversation and all its messages',
  })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({
    status: 200,
    description: 'Conversation deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async deleteConversation(
    @CurrentUser('sub') userId: string,
    @Param('id') conversationId: string,
  ): Promise<{ message: string }> {
    await this.conversationsService.deleteConversation(userId, conversationId);
    return { message: 'Conversation deleted successfully' };
  }
}
