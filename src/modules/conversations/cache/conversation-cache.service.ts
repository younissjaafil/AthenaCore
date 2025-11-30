import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../infrastructure/cache/redis.service';
import { ConversationResponseDto } from '../dto/conversation-response.dto';
import { MessageResponseDto } from '../dto/message-response.dto';

@Injectable()
export class ConversationCacheService {
  private readonly logger = new Logger(ConversationCacheService.name);

  // Cache TTL constants (in seconds)
  private readonly CONVERSATION_LIST_TTL = 300; // 5 minutes
  private readonly CONVERSATION_DETAIL_TTL = 600; // 10 minutes
  private readonly MESSAGES_TTL = 600; // 10 minutes

  constructor(private readonly redisService: RedisService) {}

  /**
   * Cache keys
   */
  private keys = {
    conversationList: (userId: string, status?: string) =>
      `conversations:user:${userId}:list${status ? `:${status}` : ''}`,
    conversationDetail: (conversationId: string) =>
      `conversations:${conversationId}:detail`,
    conversationMessages: (conversationId: string) =>
      `conversations:${conversationId}:messages`,
  };

  /**
   * Get conversation list from cache
   */
  async getConversationList(
    userId: string,
    status?: string,
  ): Promise<ConversationResponseDto[] | null> {
    const key = this.keys.conversationList(userId, status);
    return await this.redisService.get<ConversationResponseDto[]>(key);
  }

  /**
   * Cache conversation list
   */
  async setConversationList(
    userId: string,
    conversations: ConversationResponseDto[],
    status?: string,
  ): Promise<void> {
    const key = this.keys.conversationList(userId, status);
    await this.redisService.set(key, conversations, this.CONVERSATION_LIST_TTL);
    this.logger.debug(`Cached conversation list for user ${userId}`);
  }

  /**
   * Get conversation detail from cache
   */
  async getConversationDetail(
    conversationId: string,
  ): Promise<ConversationResponseDto | null> {
    const key = this.keys.conversationDetail(conversationId);
    return await this.redisService.get<ConversationResponseDto>(key);
  }

  /**
   * Cache conversation detail
   */
  async setConversationDetail(
    conversationId: string,
    conversation: ConversationResponseDto,
  ): Promise<void> {
    const key = this.keys.conversationDetail(conversationId);
    await this.redisService.set(
      key,
      conversation,
      this.CONVERSATION_DETAIL_TTL,
    );
    this.logger.debug(`Cached conversation detail ${conversationId}`);
  }

  /**
   * Get messages from cache
   */
  async getMessages(
    conversationId: string,
  ): Promise<MessageResponseDto[] | null> {
    const key = this.keys.conversationMessages(conversationId);
    return await this.redisService.get<MessageResponseDto[]>(key);
  }

  /**
   * Cache messages
   */
  async setMessages(
    conversationId: string,
    messages: MessageResponseDto[],
  ): Promise<void> {
    const key = this.keys.conversationMessages(conversationId);
    await this.redisService.set(key, messages, this.MESSAGES_TTL);
    this.logger.debug(
      `Cached ${messages.length} messages for conversation ${conversationId}`,
    );
  }

  /**
   * Invalidate all caches for a user
   */
  async invalidateUserCache(userId: string): Promise<void> {
    await this.redisService.delPattern(`conversations:user:${userId}:*`);
    this.logger.debug(`Invalidated all conversation caches for user ${userId}`);
  }

  /**
   * Invalidate cache for a specific conversation
   */
  async invalidateConversationCache(
    conversationId: string,
    userId?: string,
  ): Promise<void> {
    // Delete conversation detail and messages
    await this.redisService.del(this.keys.conversationDetail(conversationId));
    await this.redisService.del(this.keys.conversationMessages(conversationId));

    // If userId provided, also invalidate user's conversation list
    if (userId) {
      await this.invalidateUserCache(userId);
    }

    this.logger.debug(`Invalidated caches for conversation ${conversationId}`);
  }

  /**
   * Invalidate conversation list cache only (for new conversations)
   */
  async invalidateConversationListCache(userId: string): Promise<void> {
    await this.redisService.delPattern(`conversations:user:${userId}:list*`);
    this.logger.debug(`Invalidated conversation list cache for user ${userId}`);
  }

  /**
   * Update cached conversation after new message
   */
  async updateConversationAfterMessage(
    conversationId: string,
    userId: string,
    newMessage: MessageResponseDto,
    updatedConversation?: ConversationResponseDto,
  ): Promise<void> {
    // Update messages cache by appending new message
    const cachedMessages = await this.getMessages(conversationId);
    if (cachedMessages) {
      cachedMessages.push(newMessage);
      await this.setMessages(conversationId, cachedMessages);
    }

    // Update conversation detail if provided
    if (updatedConversation) {
      await this.setConversationDetail(conversationId, updatedConversation);
    }

    // Invalidate user's conversation list (to update lastMessageAt, messageCount)
    await this.invalidateConversationListCache(userId);

    this.logger.debug(
      `Updated caches after new message in conversation ${conversationId}`,
    );
  }
}
