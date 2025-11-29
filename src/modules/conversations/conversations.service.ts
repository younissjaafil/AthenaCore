import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import OpenAI from 'openai';
import { ConversationsRepository } from './repositories/conversations.repository';
import { MessagesRepository } from './repositories/messages.repository';
import { VectorSearchService } from '../rag/vector-search.service';
import {
  Conversation,
  ConversationStatus,
} from './entities/conversation.entity';
import { Message, MessageRole } from './entities/message.entity';
import { Agent } from '../agents/entities/agent.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ConversationResponseDto } from './dto/conversation-response.dto';
import { MessageResponseDto } from './dto/message-response.dto';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);
  private readonly openai: OpenAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly conversationsRepository: ConversationsRepository,
    private readonly messagesRepository: MessagesRepository,
    private readonly vectorSearchService: VectorSearchService,
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Create a new conversation
   */
  async createConversation(
    userId: string,
    dto: CreateConversationDto,
  ): Promise<ConversationResponseDto> {
    // Verify agent exists and is accessible
    const agent = await this.agentRepository.findOne({
      where: { id: dto.agentId },
    });

    if (!agent) {
      throw new NotFoundException(`Agent with ID ${dto.agentId} not found`);
    }

    // Check if conversation already exists
    const existing = await this.conversationsRepository.findByUserAndAgent(
      userId,
      dto.agentId,
    );

    if (existing) {
      return this.mapToResponseDto(existing);
    }

    // Create new conversation
    const conversation = await this.conversationsRepository.create({
      userId,
      agentId: dto.agentId,
      title: dto.title || `Conversation with ${agent.name}`,
      isArchived: false,
      totalMessages: 0,
      totalTokens: 0,
    });

    this.logger.log(
      `Created conversation ${conversation.id} for user ${userId} with agent ${dto.agentId}`,
    );

    return this.mapToResponseDto(conversation);
  }

  /**
   * Send a message and get AI response with RAG
   */
  async sendMessage(
    userId: string,
    conversationId: string,
    dto: SendMessageDto,
  ): Promise<{
    userMessage: MessageResponseDto;
    assistantMessage: MessageResponseDto;
  }> {
    // Get conversation and verify ownership
    const conversation = await this.conversationsRepository.findById(
      conversationId,
      ['agent'],
    );

    if (!conversation) {
      throw new NotFoundException(
        `Conversation with ID ${conversationId} not found`,
      );
    }

    if (conversation.userId !== userId) {
      throw new BadRequestException(
        'You do not have access to this conversation',
      );
    }

    if (conversation.status !== ConversationStatus.ACTIVE) {
      throw new BadRequestException('Conversation is not active');
    }

    // Save user message
    const userMessage = await this.messagesRepository.create({
      conversationId,
      role: MessageRole.USER,
      content: dto.content,
      tokenCount: this.estimateTokens(dto.content),
    });

    // Generate AI response with RAG
    const useRag = dto.useRag !== false; // Default to true
    const assistantResponse = await this.generateAIResponse(
      conversation,
      dto.content,
      useRag,
    );

    // Save assistant message
    const assistantMessage = await this.messagesRepository.create({
      conversationId,
      role: MessageRole.ASSISTANT,
      content: assistantResponse.content,
      tokenCount: this.estimateTokens(assistantResponse.content),
      metadata: assistantResponse.metadata,
    });

    // Update conversation message count
    await this.conversationsRepository.incrementMessageCount(conversationId);

    this.logger.log(
      `User message saved to conversation ${conversationId}, AI response generated${useRag ? ' with RAG' : ''}`,
    );

    return {
      userMessage: this.mapMessageToDto(userMessage),
      assistantMessage: this.mapMessageToDto(assistantMessage),
    };
  }

  /**
   * Get user's conversations
   */
  async getUserConversations(
    userId: string,
    status?: ConversationStatus,
  ): Promise<ConversationResponseDto[]> {
    const conversations = await this.conversationsRepository.findByUser(
      userId,
      status,
    );

    return conversations.map((conv) => this.mapToResponseDto(conv));
  }

  /**
   * Get conversation with messages
   */
  async getConversation(
    userId: string,
    conversationId: string,
  ): Promise<ConversationResponseDto> {
    const conversation = await this.conversationsRepository.findById(
      conversationId,
      ['agent'],
    );

    if (!conversation) {
      throw new NotFoundException(
        `Conversation with ID ${conversationId} not found`,
      );
    }

    if (conversation.userId !== userId) {
      throw new BadRequestException(
        'You do not have access to this conversation',
      );
    }

    const messages =
      await this.messagesRepository.findByConversation(conversationId);

    return {
      ...this.mapToResponseDto(conversation),
      messages: messages.map((msg) => this.mapMessageToDto(msg)),
    };
  }

  /**
   * Archive a conversation
   */
  async archiveConversation(
    userId: string,
    conversationId: string,
  ): Promise<void> {
    const conversation =
      await this.conversationsRepository.findById(conversationId);

    if (!conversation) {
      throw new NotFoundException(
        `Conversation with ID ${conversationId} not found`,
      );
    }

    if (conversation.userId !== userId) {
      throw new BadRequestException(
        'You do not have access to this conversation',
      );
    }

    await this.conversationsRepository.update(conversationId, {
      status: ConversationStatus.ARCHIVED,
    });

    this.logger.log(
      `Conversation ${conversationId} archived by user ${userId}`,
    );
  }

  /**
   * Generate AI response with RAG context
   */
  private async generateAIResponse(
    conversation: Conversation,
    userQuery: string,
    useRag: boolean,
  ): Promise<{
    content: string;
    metadata: any;
  }> {
    let ragContext = '';
    let ragSources: any[] = [];

    // Get RAG context if enabled
    if (useRag) {
      try {
        this.logger.log(
          `RAG search for agent ${conversation.agentId}: "${userQuery.substring(0, 50)}..."`,
        );

        const searchResults = await this.vectorSearchService.search(
          conversation.agentId,
          userQuery,
          5,
          0.5, // Lowered threshold for better recall
        );

        this.logger.log(
          `RAG search returned ${searchResults.length} results for agent ${conversation.agentId}`,
        );

        if (searchResults.length > 0) {
          // Build context from search results
          ragContext = searchResults
            .map(
              (result, idx) =>
                `[Source ${idx + 1}] (Similarity: ${Math.round(result.similarity * 100)}%)\n${result.content}`,
            )
            .join('\n\n');

          // Store source references
          ragSources = searchResults.map((result) => ({
            documentId: result.documentId,
            chunkIndex: result.chunkIndex,
            similarity: result.similarity,
          }));

          this.logger.log(
            `Retrieved ${searchResults.length} RAG sources for conversation ${conversation.id}`,
          );
        }
      } catch (error) {
        this.logger.warn(
          `Failed to retrieve RAG context: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    // Get conversation history
    const history = await this.messagesRepository.getConversationHistory(
      conversation.id,
      10,
    );

    // Build the prompt
    const systemPrompt = this.buildSystemPrompt(conversation.agent, ragContext);
    const messages: Array<{
      role: 'system' | 'user' | 'assistant';
      content: string;
    }> = [
      { role: 'system', content: systemPrompt },
      ...history.map((h) => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      })),
      { role: 'user', content: userQuery },
    ];

    // Call OpenAI API
    let responseContent: string;
    try {
      const completion = await this.openai.chat.completions.create({
        model: conversation.agent.model || 'gpt-4',
        messages,
        temperature: Number(conversation.agent.temperature) || 0.7,
        max_tokens: conversation.agent.maxTokens || 2000,
      });

      responseContent =
        completion.choices[0]?.message?.content ||
        'I apologize, but I was unable to generate a response. Please try again.';

      this.logger.log(
        `OpenAI response generated for conversation ${conversation.id}, tokens: ${completion.usage?.total_tokens}`,
      );
    } catch (error: any) {
      this.logger.error(`OpenAI API error: ${error.message}`);
      responseContent =
        'I apologize, but I encountered an error while processing your request. Please try again later.';
    }

    return {
      content: responseContent,
      metadata: {
        model: conversation.agent.model,
        ragContext: useRag && ragSources.length > 0,
        ragSources: ragSources.length > 0 ? ragSources : undefined,
        tokensUsed: this.estimateTokens(systemPrompt + responseContent),
      },
    };
  }

  /**
   * Build system prompt with RAG context
   */
  private buildSystemPrompt(agent: Agent, ragContext: string): string {
    let prompt =
      agent.systemPrompt || `You are ${agent.name}, a helpful AI assistant.`;

    if (ragContext) {
      prompt += `\n\n## Knowledge Base Context\n\nUse the following context from the knowledge base to answer the user's question. If the context doesn't contain relevant information, acknowledge this and provide a general response based on your knowledge.\n\n${ragContext}`;
    }

    return prompt;
  }

  /**
   * Estimate token count (simple approximation)
   */
  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Map entity to response DTO
   */
  private mapToResponseDto(
    conversation: Conversation,
  ): ConversationResponseDto {
    return {
      id: conversation.id,
      userId: conversation.userId,
      agentId: conversation.agentId,
      title: conversation.title || undefined,
      status: conversation.status,
      messageCount: conversation.totalMessages,
      lastMessageAt: conversation.updatedAt,
      agent: conversation.agent
        ? {
            id: conversation.agent.id,
            name: conversation.agent.name,
            tagline: conversation.agent.description || '',
          }
        : undefined,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
  }

  /**
   * Map message entity to DTO
   */
  private mapMessageToDto(message: Message): MessageResponseDto {
    return {
      id: message.id,
      conversationId: message.conversationId,
      role: message.role,
      content: message.content,
      metadata: message.metadata,
      tokenCount: message.tokenCount,
      createdAt: message.createdAt,
    };
  }
}
