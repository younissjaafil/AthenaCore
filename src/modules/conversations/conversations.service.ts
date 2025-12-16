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
import { ConversationCacheService } from './cache/conversation-cache.service';
import {
  VectorSearchService,
  AgentRagConfig,
} from '../rag/vector-search.service';
import { RagQueryLogService } from '../rag/rag-query-log.service';
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
    private readonly cacheService: ConversationCacheService,
    private readonly vectorSearchService: VectorSearchService,
    private readonly ragQueryLogService: RagQueryLogService,
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

    // Invalidate user's conversation list cache
    await this.cacheService.invalidateConversationListCache(userId);

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

    // Update cache with new messages
    const userMessageDto = this.mapMessageToDto(userMessage);
    const assistantMessageDto = this.mapMessageToDto(assistantMessage);

    await this.cacheService.updateConversationAfterMessage(
      conversationId,
      conversation.userId,
      userMessageDto,
    );
    await this.cacheService.updateConversationAfterMessage(
      conversationId,
      conversation.userId,
      assistantMessageDto,
    );

    this.logger.log(
      `User message saved to conversation ${conversationId}, AI response generated${useRag ? ' with RAG' : ''}`,
    );

    return {
      userMessage: userMessageDto,
      assistantMessage: assistantMessageDto,
    };
  }

  /**
   * Get user's conversations (with caching)
   */
  async getUserConversations(
    userId: string,
    status?: ConversationStatus,
  ): Promise<ConversationResponseDto[]> {
    // Try cache first
    const cached = await this.cacheService.getConversationList(userId, status);
    if (cached) {
      this.logger.debug(`Cache hit for user ${userId} conversations`);
      return cached;
    }

    // Cache miss - fetch from DB
    this.logger.debug(`Cache miss for user ${userId} conversations`);
    const conversations = await this.conversationsRepository.findByUser(
      userId,
      status,
    );

    const dtos = conversations.map((conv) => this.mapToResponseDto(conv));

    // Cache the result
    await this.cacheService.setConversationList(userId, dtos, status);

    return dtos;
  }

  /**
   * Get conversation with messages (with caching)
   */
  async getConversation(
    userId: string,
    conversationId: string,
  ): Promise<ConversationResponseDto> {
    // Try cache first
    const cachedConversation =
      await this.cacheService.getConversationDetail(conversationId);
    const cachedMessages = await this.cacheService.getMessages(conversationId);

    if (cachedConversation && cachedMessages) {
      // Verify user access from cache
      if (cachedConversation.userId !== userId) {
        throw new BadRequestException(
          'You do not have access to this conversation',
        );
      }
      this.logger.debug(`Cache hit for conversation ${conversationId}`);
      return {
        ...cachedConversation,
        messages: cachedMessages,
      };
    }

    // Cache miss - fetch from DB
    this.logger.debug(`Cache miss for conversation ${conversationId}`);
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

    const conversationDto = this.mapToResponseDto(conversation);
    const messageDtos = messages.map((msg) => this.mapMessageToDto(msg));

    // Cache the results
    await this.cacheService.setConversationDetail(
      conversationId,
      conversationDto,
    );
    await this.cacheService.setMessages(conversationId, messageDtos);

    return {
      ...conversationDto,
      messages: messageDtos,
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

    // Invalidate cache
    await this.cacheService.invalidateConversationCache(conversationId, userId);

    this.logger.log(
      `Conversation ${conversationId} archived by user ${userId}`,
    );
  }

  /**
   * Delete a conversation (soft delete)
   */
  async deleteConversation(
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
      status: ConversationStatus.DELETED,
    });

    // Invalidate cache
    await this.cacheService.invalidateConversationCache(conversationId, userId);

    this.logger.log(`Conversation ${conversationId} deleted by user ${userId}`);
  }

  /**
   * Generate AI response with RAG context and guardrails
   */
  private async generateAIResponse(
    conversation: Conversation,
    userQuery: string,
    useRag: boolean,
  ): Promise<{
    content: string;
    metadata: any;
  }> {
    const agent = conversation.agent;
    let ragContext = '';
    let ragSources: any[] = [];
    let ragOutcome: 'answered' | 'idk' = 'answered';
    let idkReason: string | undefined;
    let retrievalMs = 0;
    let contextTokenCount = 0;
    let citations: any[] = [];

    // Build agent RAG config from entity fields
    const ragConfig: AgentRagConfig = {
      ragSimilarityThreshold: Number(agent.ragSimilarityThreshold) || 0.7,
      ragMaxResults: agent.ragMaxResults || 10,
      ragMaxTokens: agent.ragMaxTokens || 3000,
      ragMinConfidenceThreshold:
        Number(agent.ragMinConfidenceThreshold) || 0.55,
      ragEnableGuardrails: agent.ragEnableGuardrails ?? true,
      ragEnableReranking: agent.ragEnableReranking ?? false,
      ragIdkMessage: agent.ragIdkMessage,
    };

    // Get RAG context if enabled
    if (useRag) {
      try {
        const searchResult = await this.vectorSearchService.searchWithGuardrails(
          conversation.agentId,
          userQuery,
          ragConfig,
        );

        ragContext = searchResult.context;
        ragOutcome = searchResult.guardrail.outcome;
        idkReason = searchResult.guardrail.reason;
        retrievalMs = searchResult.retrievalMs;
        contextTokenCount = searchResult.contextTokenCount;
        citations = searchResult.citations;

        // Store source references
        ragSources = searchResult.results.map((result) => ({
          documentId: result.documentId,
          chunkIndex: result.chunkIndex,
          similarity: result.similarity,
        }));

        this.logger.log(
          `RAG with guardrails: agent=${agent.id} outcome=${ragOutcome} results=${searchResult.results.length} tokens=${contextTokenCount}`,
        );

        // If guardrail says IDK, return early with the IDK message
        if (ragOutcome === 'idk' && ragConfig.ragEnableGuardrails) {
          const idkMessage =
            this.vectorSearchService.getIdkMessage(ragConfig);

          // Log the query if logging is enabled
          if (agent.ragEnableLogging) {
            await this.logRagQuery(
              conversation,
              userQuery,
              ragConfig,
              ragOutcome,
              idkReason,
              retrievalMs,
              contextTokenCount,
              citations,
            );
          }

          return {
            content: idkMessage,
            metadata: {
              model: agent.model,
              ragContext: false,
              ragSources: ragSources.length > 0 ? ragSources : undefined,
              ragOutcome,
              ragIdkReason: idkReason,
              tokensUsed: this.estimateTokens(idkMessage),
            },
          };
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
    const systemPrompt = this.buildSystemPrompt(agent, ragContext);
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
    let openaiMs = 0;
    let totalTokensApprox = 0;
    const openaiStart = Date.now();

    try {
      const completion = await this.openai.chat.completions.create({
        model: agent.model || 'gpt-4',
        messages,
        temperature: Number(agent.temperature) || 0.7,
        max_tokens: agent.maxTokens || 2000,
      });

      openaiMs = Date.now() - openaiStart;
      totalTokensApprox = completion.usage?.total_tokens || 0;

      responseContent =
        completion.choices[0]?.message?.content ||
        'I apologize, but I was unable to generate a response. Please try again.';

      this.logger.log(
        `OpenAI response generated for conversation ${conversation.id}, tokens: ${totalTokensApprox}, time: ${openaiMs}ms`,
      );
    } catch (error) {
      openaiMs = Date.now() - openaiStart;
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`OpenAI API error: ${message}`);
      responseContent =
        'I apologize, but I encountered an error while processing your request. Please try again later.';
    }

    // Log the RAG query if logging is enabled
    if (useRag && agent.ragEnableLogging) {
      await this.logRagQuery(
        conversation,
        userQuery,
        ragConfig,
        ragOutcome,
        idkReason,
        retrievalMs,
        contextTokenCount,
        citations,
        openaiMs,
        totalTokensApprox,
        agent.model || 'gpt-4',
      );
    }

    return {
      content: responseContent,
      metadata: {
        model: agent.model,
        ragContext: useRag && ragSources.length > 0,
        ragSources: ragSources.length > 0 ? ragSources : undefined,
        ragOutcome: useRag ? ragOutcome : undefined,
        tokensUsed: this.estimateTokens(systemPrompt + responseContent),
      },
    };
  }

  /**
   * Log RAG query for analytics
   */
  private async logRagQuery(
    conversation: Conversation,
    query: string,
    config: AgentRagConfig,
    outcome: 'answered' | 'idk',
    idkReason: string | undefined,
    retrievalMs: number,
    contextTokenCount: number,
    citations: any[],
    openaiMs: number = 0,
    totalTokensApprox: number = 0,
    model: string = 'gpt-4',
  ): Promise<void> {
    try {
      await this.ragQueryLogService.logQuery({
        userId: conversation.userId,
        agentId: conversation.agentId,
        query,
        topK: config.ragMaxResults,
        stats: {
          latencyMs: retrievalMs + openaiMs,
          retrievalMs,
          openaiMs,
          topK: config.ragMaxResults,
          retrievedCount: citations.length,
          rerankUsed: config.ragEnableReranking,
          contextTokenCount,
          model,
          totalTokensApprox,
        },
        citations,
        guardrail: { outcome, reason: idkReason },
        conversationId: conversation.id,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to log RAG query: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Build system prompt with RAG context
   */
  private buildSystemPrompt(agent: Agent, ragContext: string): string {
    let prompt =
      agent.systemPrompt || `You are ${agent.name}, a helpful AI assistant.`;

    if (ragContext) {
      prompt += `\n\n## IMPORTANT: Knowledge Base Context\n\nYou have access to the following information from uploaded documents. Use ALL relevant information from this context to provide comprehensive, detailed answers. Include specific details, names, dates, skills, and experiences mentioned in the context.\n\n${ragContext}\n\n## Instructions\n- Prioritize information from the context above over your general knowledge\n- Include specific details and examples from the context\n- If the context contains relevant information, use it fully\n- Only say you don't have information if it's truly not in the context`;
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
