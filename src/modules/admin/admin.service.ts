import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Creator } from '../creators/entities/creator.entity';
import { Agent } from '../agents/entities/agent.entity';
import { Document } from '../documents/entities/document.entity';
import { Conversation } from '../conversations/entities/conversation.entity';
import { Message } from '../conversations/entities/message.entity';
import { Session } from '../sessions/entities/session.entity';
import { SessionStatus } from '../sessions/entities/session.entity';
import { Transaction } from '../payments/entities/transaction.entity';
import { TransactionStatus } from '../payments/entities/transaction.entity';
import { Entitlement } from '../payments/entities/entitlement.entity';
import { Embedding } from '../rag/entities/embedding.entity';
import {
  SystemStatsDto,
  UserStatsDto,
  CreatorStatsDto,
  AgentStatsDto,
} from './dto/system-stats.dto';
import { UserRole } from '../../common/constants/roles.enum';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Creator)
    private readonly creatorRepository: Repository<Creator>,
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Entitlement)
    private readonly entitlementRepository: Repository<Entitlement>,
    @InjectRepository(Embedding)
    private readonly embeddingRepository: Repository<Embedding>,
  ) {}

  async getSystemStats(): Promise<SystemStatsDto> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalUsers,
      totalCreators,
      totalAgents,
      totalDocuments,
      totalConversations,
      totalSessions,
      totalTransactions,
      totalEmbeddings,
      activeUsers,
    ] = await Promise.all([
      this.userRepository.count(),
      this.creatorRepository.count(),
      this.agentRepository.count(),
      this.documentRepository.count(),
      this.conversationRepository.count(),
      this.sessionRepository.count(),
      this.transactionRepository.count(),
      this.embeddingRepository.count(),
      this.conversationRepository
        .createQueryBuilder('conversation')
        .select('COUNT(DISTINCT conversation.userId)', 'count')
        .where('conversation.createdAt > :date', { date: thirtyDaysAgo })
        .getRawOne()
        .then((result) => parseInt((result as { count: string }).count, 10)),
    ]);

    const transactions = await this.transactionRepository.find({
      where: { status: TransactionStatus.SUCCESS },
    });

    const totalRevenue = transactions.reduce((sum, txn) => sum + txn.amount, 0);

    return {
      totalUsers,
      totalCreators,
      totalAgents,
      totalDocuments,
      totalConversations,
      totalSessions,
      totalTransactions,
      totalRevenue,
      totalEmbeddings,
      activeUsers,
    };
  }

  async getUserStats(userId: string): Promise<UserStatsDto> {
    const user = await this.userRepository.findOne({
      where: { clerkId: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [
      conversationCount,
      sessionCount,
      transactionCount,
      entitlementCount,
      lastConversation,
    ] = await Promise.all([
      this.conversationRepository.count({ where: { userId: user.id } }),
      this.sessionRepository.count({ where: { userId: user.id } }),
      this.transactionRepository.count({ where: { userId: user.id } }),
      this.entitlementRepository.count({
        where: { userId: user.id, isActive: true },
      }),
      this.conversationRepository.findOne({
        where: { userId: user.id },
        order: { createdAt: 'DESC' },
      }),
    ]);

    const transactions = await this.transactionRepository.find({
      where: { userId: user.id, status: TransactionStatus.SUCCESS },
    });

    const totalSpent = transactions.reduce((sum, txn) => sum + txn.amount, 0);

    return {
      userId: user.id, // Use internal UUID, not clerk_id (which may be null for system users)
      email: user.email,
      conversationCount,
      sessionCount,
      transactionCount,
      totalSpent,
      entitlementCount,
      lastActivity: lastConversation?.createdAt || user.createdAt,
    };
  }

  async getCreatorStats(creatorId: string): Promise<CreatorStatsDto> {
    const creator = await this.creatorRepository.findOne({
      where: { id: creatorId },
      relations: ['user'],
    });

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    const [agentCount, sessionCount, documentCount] = await Promise.all([
      this.agentRepository.count({ where: { creatorId } }),
      this.sessionRepository.count({ where: { creatorId } }),
      this.documentRepository
        .createQueryBuilder('doc')
        .innerJoin('doc.agent', 'agent')
        .where('agent.creatorId = :creatorId', { creatorId })
        .getCount(),
    ]);

    const sessions = await this.sessionRepository.find({
      where: { creatorId, status: SessionStatus.COMPLETED },
    });

    const totalRevenue = sessions.reduce(
      (sum, session) => sum + session.price,
      0,
    );

    return {
      creatorId: creator.id,
      creatorName: `${creator.user.firstName} ${creator.user.lastName}`,
      agentCount,
      sessionCount,
      totalRevenue,
      averageRating: 0, // Placeholder for rating system
      documentCount,
      isVerified: creator.isAvailable, // Use availability as verification proxy for now
    };
  }

  async getAgentStats(agentId: string): Promise<AgentStatsDto> {
    const agent = await this.agentRepository.findOne({
      where: { id: agentId },
      relations: ['creator', 'creator.user'],
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    const [conversationCount, messageCount, documentCount, embeddingCount] =
      await Promise.all([
        this.conversationRepository.count({ where: { agentId } }),
        this.messageRepository
          .createQueryBuilder('message')
          .innerJoin('message.conversation', 'conversation')
          .where('conversation.agentId = :agentId', { agentId })
          .getCount(),
        this.documentRepository.count({ where: { agentId } }),
        this.embeddingRepository.count({ where: { agentId } }),
      ]);

    const transactions = await this.transactionRepository.find({
      where: {
        status: TransactionStatus.SUCCESS,
      },
    });

    // Filter transactions by metadata.agentId if present
    // Note: agentId is stored in metadata but not in the type definition
    const agentTransactions = transactions.filter((txn) => {
      const metadata = txn.metadata as Record<string, any>;
      return metadata?.agentId === agentId;
    });

    const totalRevenue = agentTransactions.reduce(
      (sum, txn) => sum + txn.amount,
      0,
    );

    return {
      agentId: agent.id,
      agentName: agent.name,
      creatorName: `${agent.creator.user.firstName} ${agent.creator.user.lastName}`,
      conversationCount,
      messageCount,
      documentCount,
      embeddingCount,
      totalRevenue,
      isPublic: agent.isPublic,
      createdAt: agent.createdAt,
    };
  }

  async updateUserRoles(
    userId: string,
    roles: UserRole[],
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.userRepository.findOne({
      where: { clerkId: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update user roles array
    user.roles = roles;
    await this.userRepository.save(user);

    return {
      success: true,
      message: `User roles updated to: ${roles.join(', ')}`,
    };
  }

  async deactivateUser(
    userId: string,
    reason?: string,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.userRepository.findOne({
      where: { clerkId: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.isActive = false;
    // Note: deactivation reason stored in audit log or separate table
    // TODO: Add deactivation tracking in v2 schema

    await this.userRepository.save(user);

    return {
      success: true,
      message: 'User deactivated successfully',
    };
  }

  async reactivateUser(
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.userRepository.findOne({
      where: { clerkId: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.isActive = true;
    await this.userRepository.save(user);

    return {
      success: true,
      message: 'User reactivated successfully',
    };
  }

  async deleteAgent(
    agentId: string,
  ): Promise<{ success: boolean; message: string }> {
    const agent = await this.agentRepository.findOne({
      where: { id: agentId },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    await this.agentRepository.softRemove(agent);

    return {
      success: true,
      message: 'Agent deleted successfully',
    };
  }

  async getAllUsers(limit = 100, offset = 0): Promise<User[]> {
    return this.userRepository.find({
      take: limit,
      skip: offset,
      order: { createdAt: 'DESC' },
    });
  }

  async getAllCreators(limit = 100, offset = 0): Promise<Creator[]> {
    return this.creatorRepository.find({
      take: limit,
      skip: offset,
      order: { createdAt: 'DESC' },
      relations: ['user'],
    });
  }

  async getAllAgents(limit = 100, offset = 0): Promise<Agent[]> {
    return this.agentRepository.find({
      take: limit,
      skip: offset,
      order: { createdAt: 'DESC' },
      relations: ['creator', 'creator.user'],
    });
  }
}
