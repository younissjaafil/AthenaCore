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
import { DuckDuckGoSearchService } from '../search/duckduckgo-search.service';

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
    private readonly duckDuckGoSearchService: DuckDuckGoSearchService,
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
    const useWebSearch = dto.useWebSearch === true; // Default to false
    const assistantResponse = await this.generateAIResponse(
      conversation,
      dto.content,
      useRag,
      useWebSearch,
    );

    // Save assistant message
    const assistantMessage = await this.messagesRepository.create({
      conversationId,
      role: MessageRole.ASSISTANT,
      content: assistantResponse.content,
      tokenCount: this.estimateTokens(assistantResponse.content),
      metadata: assistantResponse.metadata as Record<string, any>,
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
   * Delete a conversation (hard delete)
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

    // Delete the conversation (cascades to messages)
    await this.conversationsRepository.delete(conversationId);

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
    useWebSearch: boolean = false,
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
    let webSearchContext = '';
    let webSearchSources: any[] = [];

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

    // Get web search results if enabled
    if (useWebSearch) {
      try {
        const webResults = await this.duckDuckGoSearchService.search(
          userQuery,
          5,
        );
        webSearchContext =
          this.duckDuckGoSearchService.formatSearchResultsAsContext(webResults);

        webSearchSources = webResults.map((result) => ({
          title: result.title,
          url: result.url,
          snippet: result.snippet,
        }));

        this.logger.log(
          `Web search for "${userQuery}" returned ${webResults.length} results`,
        );
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(`Web search failed: ${errorMessage}`);
      }
    }

    // Get RAG context if enabled
    if (useRag) {
      try {
        const searchResult =
          await this.vectorSearchService.searchWithGuardrails(
            conversation.agentId,
            userQuery,
            ragConfig,
          );

        ragContext = searchResult.context;
        ragOutcome = searchResult.guardrail.outcome;
        idkReason = searchResult.guardrail.reason;
        retrievalMs = searchResult.retrievalMs;
        contextTokenCount = searchResult.contextTokenCount;
        citations = (searchResult.citations || []) as any[];

        // Store source references with document names for frontend display
        ragSources = searchResult.results.map((result) => ({
          documentId: result.documentId,
          documentName:
            result.documentName ||
            (result.metadata as Record<string, any>)?.documentTitle ||
            'Document',
          chunkIndex: result.chunkIndex,
          similarity: result.similarity,
        }));

        this.logger.log(
          `RAG with guardrails: agent=${agent.id} outcome=${ragOutcome} results=${searchResult.results.length} tokens=${contextTokenCount}`,
        );

        // Handle IDK outcomes based on reason and web search availability
        if (ragOutcome === 'idk' && ragConfig.ragEnableGuardrails) {
          // If no documents exist (no_results), allow LLM to answer with general knowledge
          // If documents exist but similarity is low, only allow if web search is enabled
          const shouldReturnIdk = 
            idkReason === 'low_similarity' && !useWebSearch;
          
          if (shouldReturnIdk) {
            const idkMessage = this.vectorSearchService.getIdkMessage(ragConfig);

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
          
          // If IDK but we're continuing (no_results or web search enabled), clear RAG context
          if (idkReason === 'no_results') {
            ragContext = ''; // No documents, use general knowledge
            this.logger.log(
              `RAG guardrail triggered (no_results), allowing LLM to answer with general knowledge for query: "${userQuery}"`,
            );
          } else if (useWebSearch) {
            ragContext = ''; // Clear RAG context, use web search instead
            this.logger.log(
              `RAG guardrail triggered (low_similarity) but web search enabled, continuing with web search for query: "${userQuery}"`,
            );
          }
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
    const systemPrompt = this.buildSystemPrompt(
      agent,
      ragContext,
      webSearchContext,
    );
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
        webSearchEnabled: useWebSearch,
        webSearchSources:
          webSearchSources.length > 0 ? webSearchSources : undefined,
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
   * Build system prompt with RAG context and web search context
   */
  private buildSystemPrompt(
    agent: Agent,
    ragContext: string,
    webSearchContext: string = '',
  ): string {
    let prompt =
      agent.systemPrompt || `You are ${agent.name}, a helpful AI assistant.`;

    if (webSearchContext) {
      prompt += webSearchContext;
    }

    if (ragContext) {
      prompt += `

## 📚 KNOWLEDGE BASE CONTEXT

The following excerpts are from uploaded documents in your knowledge base. Each source is labeled with its document name, section, and relevance score.

${ragContext}

## 📋 INSTRUCTIONS FOR USING THIS CONTEXT

1. **PRIORITIZE document information** - Always prefer information from the sources above over your general knowledge
2. **BE COMPREHENSIVE** - Include ALL relevant details from the context: names, dates, numbers, skills, qualifications, etc.
3. **CITE your sources** - When answering, mention which document or section the information comes from (e.g., "According to [document name]...")
4. **SYNTHESIZE multiple sources** - If information spans multiple sources, combine them coherently
5. **ACKNOWLEDGE limitations** - If the context doesn't contain enough information to fully answer, say so clearly
6. **PRESERVE specifics** - Don't paraphrase away important details; include exact figures, lists, and technical terms
7. **MATCH the question scope** - If asked for specific details, provide them; if asked for summaries, synthesize appropriately`;
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
