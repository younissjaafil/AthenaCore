import {
  Injectable,
  NotFoundException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TransactionsRepository } from './repositories/transactions.repository';
import { EntitlementsRepository } from './repositories/entitlements.repository';
import { WhishService } from './services/whish.service';
import { CreatePaymentDto, PaymentCurrency } from './dto/create-payment.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { CollectStatus } from './dto/payment-status.dto';
import {
  Transaction,
  TransactionType,
  TransactionStatus,
} from './entities/transaction.entity';
import { AgentsService } from '../agents/agents.service';
import { SessionsService } from '../sessions/sessions.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly transactionsRepository: TransactionsRepository,
    private readonly entitlementsRepository: EntitlementsRepository,
    private readonly whishService: WhishService,
    @Inject(forwardRef(() => AgentsService))
    private readonly agentsService: AgentsService,
    @Inject(forwardRef(() => SessionsService))
    private readonly sessionsService: SessionsService,
  ) {}

  /**
   * Get account balance
   */
  async getBalance(): Promise<{ balance: number }> {
    const balance = await this.whishService.getBalance();
    return { balance };
  }

  /**
   * Create a payment for agent access
   */
  async createAgentPayment(
    userId: string,
    agentId: string,
    dto: CreatePaymentDto,
  ): Promise<PaymentResponseDto> {
    // Generate external ID
    const externalId = await this.transactionsRepository.getNextExternalId();

    // Website URL registered with Whish (athena-ai.pro)
    const websiteUrl = this.configService.get<string>(
      'WHISH_WEBSITE_URL',
      'athena-ai.pro',
    );

    // All URLs go through the frontend domain (required by Whish)
    // The frontend API routes will forward callbacks to the backend
    const successCallbackUrl =
      dto.successCallbackUrl || `https://${websiteUrl}/api/payment/success`;
    const failureCallbackUrl =
      dto.failureCallbackUrl || `https://${websiteUrl}/api/payment/failure`;
    const successRedirectUrl =
      dto.successRedirectUrl ||
      `https://${websiteUrl}/student/payments/callback?status=success`;
    const failureRedirectUrl =
      dto.failureRedirectUrl ||
      `https://${websiteUrl}/student/payments/callback?status=failed`;

    // Create payment with Whish
    const whishResponse = await this.whishService.createPayment({
      amount: dto.amount,
      currency: dto.currency,
      invoice: dto.invoice,
      externalId,
      successCallbackUrl,
      failureCallbackUrl,
      successRedirectUrl,
      failureRedirectUrl,
    });

    // Save transaction
    const transaction = await this.transactionsRepository.create({
      userId,
      agentId,
      externalId,
      amount: dto.amount,
      currency: dto.currency,
      status: TransactionStatus.PENDING,
      paymentMethod: 'whish',
      collectUrl: whishResponse.collectUrl,
      metadata: {
        type: TransactionType.AGENT_PURCHASE,
        invoice: dto.invoice,
        successCallbackUrl,
        failureCallbackUrl,
        successRedirectUrl,
        failureRedirectUrl,
        whishResponse,
      },
    });

    this.logger.log(
      `Payment created for user ${userId}, agent ${agentId}: ${transaction.id}`,
    );

    return this.mapToResponseDto(transaction);
  }

  /**
   * Create a payment for session booking
   */
  async createSessionPayment(
    userId: string,
    sessionId: string,
    dto: CreatePaymentDto,
  ): Promise<PaymentResponseDto> {
    // Generate external ID
    const externalId = await this.transactionsRepository.getNextExternalId();

    // Website URL registered with Whish (athena-ai.pro)
    const websiteUrl = this.configService.get<string>(
      'WHISH_WEBSITE_URL',
      'athena-ai.pro',
    );

    // All URLs go through the frontend domain (required by Whish)
    const successCallbackUrl =
      dto.successCallbackUrl || `https://${websiteUrl}/api/payment/success`;
    const failureCallbackUrl =
      dto.failureCallbackUrl || `https://${websiteUrl}/api/payment/failure`;
    const successRedirectUrl =
      dto.successRedirectUrl ||
      `https://${websiteUrl}/student/payments/callback?status=success&sessionId=${sessionId}`;
    const failureRedirectUrl =
      dto.failureRedirectUrl ||
      `https://${websiteUrl}/student/payments/callback?status=failed&sessionId=${sessionId}`;

    // Create payment with Whish
    const whishResponse = await this.whishService.createPayment({
      amount: dto.amount,
      currency: dto.currency,
      invoice: dto.invoice || `Session booking payment`,
      externalId,
      successCallbackUrl,
      failureCallbackUrl,
      successRedirectUrl,
      failureRedirectUrl,
    });

    // Save transaction
    const transaction = await this.transactionsRepository.create({
      userId,
      sessionId,
      externalId,
      amount: dto.amount,
      currency: dto.currency,
      status: TransactionStatus.PENDING,
      paymentMethod: 'whish',
      collectUrl: whishResponse.collectUrl,
      metadata: {
        type: TransactionType.SESSION_BOOKING,
        invoice: dto.invoice,
        sessionId,
        successCallbackUrl,
        failureCallbackUrl,
        successRedirectUrl,
        failureRedirectUrl,
        whishResponse,
      },
    });

    this.logger.log(
      `Session payment created for user ${userId}, session ${sessionId}: ${transaction.id}`,
    );

    return this.mapToResponseDto(transaction);
  }

  /**
   * Get payment status and update transaction
   */
  async getPaymentStatus(transactionId: string): Promise<PaymentResponseDto> {
    const transaction =
      await this.transactionsRepository.findById(transactionId);

    if (!transaction) {
      throw new NotFoundException(`Transaction ${transactionId} not found`);
    }

    // If already completed, just return current status
    if (
      transaction.status === TransactionStatus.SUCCESS ||
      transaction.status === TransactionStatus.FAILED
    ) {
      return this.mapToResponseDto(transaction);
    }

    // Get status from Whish
    const whishStatus = await this.whishService.getPaymentStatus({
      currency: transaction.currency as unknown as PaymentCurrency,
      externalId: transaction.externalId,
    });

    // Map status
    const newStatus = this.mapWhishStatus(whishStatus.collectStatus);

    // Update transaction if status changed
    if (newStatus !== transaction.status) {
      await this.transactionsRepository.update(transaction.id, {
        status: newStatus,
        payerPhoneNumber: whishStatus.payerPhoneNumber,
        completedAt:
          newStatus === TransactionStatus.SUCCESS ? new Date() : undefined,
      });

      transaction.status = newStatus;
      transaction.payerPhoneNumber = whishStatus.payerPhoneNumber;

      // Grant entitlement if payment successful
      if (newStatus === TransactionStatus.SUCCESS && transaction.agentId) {
        await this.grantEntitlement(
          transaction.userId,
          transaction.agentId,
          transaction.id,
        );
      }

      this.logger.log(
        `Transaction ${transactionId} status updated: ${newStatus}`,
      );
    }

    return this.mapToResponseDto(transaction);
  }

  /**
   * Get invoice URL and transaction details for opening payment page
   */
  async getInvoice(transactionId: string): Promise<{
    collectUrl: string;
    transactionId: string;
    amount: number;
    currency: string;
    status: string;
    agentId?: string;
  }> {
    const transaction =
      await this.transactionsRepository.findById(transactionId);

    if (!transaction) {
      throw new NotFoundException(`Transaction ${transactionId} not found`);
    }

    return {
      collectUrl: transaction.collectUrl,
      transactionId: transaction.id,
      amount: transaction.amount,
      currency: transaction.currency,
      status: transaction.status,
      agentId: transaction.agentId ?? undefined,
    };
  }

  /**
   * Get user's transactions
   */
  async getUserTransactions(userId: string): Promise<PaymentResponseDto[]> {
    const transactions = await this.transactionsRepository.findByUser(userId);
    return transactions.map((t) => this.mapToResponseDto(t));
  }

  /**
   * Check if user has access to an agent
   */
  async canAccessAgent(userId: string, agentId: string): Promise<boolean> {
    return this.entitlementsRepository.hasAccess(userId, agentId);
  }

  /**
   * Check agent access with full pricing info
   */
  async checkAgentAccess(
    userId: string,
    agentId: string,
  ): Promise<{
    hasAccess: boolean;
    isFree?: boolean;
    pricePerMessage?: number;
    pricePerConversation?: number;
  }> {
    try {
      // Get agent info
      const agent = await this.agentsService.findOne(agentId);

      // If agent is free, always has access
      if (agent.isFree) {
        return {
          hasAccess: true,
          isFree: true,
          pricePerMessage: 0,
          pricePerConversation: 0,
        };
      }

      // Check if user has entitlement
      const hasAccess = await this.entitlementsRepository.hasAccess(
        userId,
        agentId,
      );

      return {
        hasAccess,
        isFree: false,
        pricePerMessage: agent.pricePerMessage,
        pricePerConversation: agent.pricePerConversation,
      };
    } catch (error) {
      this.logger.error(
        `Error checking agent access: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return { hasAccess: false };
    }
  }

  /**
   * Get user's active entitlements
   */
  async getUserEntitlements(userId: string) {
    const entitlements =
      await this.entitlementsRepository.findActiveByUser(userId);
    return entitlements.map((e) => ({
      id: e.id,
      agentId: e.agentId,
      agentName: e.agent?.name,
      expiresAt: e.expiresAt,
      createdAt: e.createdAt,
    }));
  }

  /**
   * Handle payment callback (webhook)
   */
  async handlePaymentCallback(
    externalId: string,
    status: 'success' | 'failure',
  ): Promise<void> {
    const transaction =
      await this.transactionsRepository.findByExternalId(externalId);

    if (!transaction) {
      this.logger.warn(
        `Callback received for unknown transaction: ${externalId}`,
      );
      return;
    }

    const newStatus =
      status === 'success'
        ? TransactionStatus.SUCCESS
        : TransactionStatus.FAILED;

    await this.transactionsRepository.update(transaction.id, {
      status: newStatus,
      completedAt: new Date(),
    });

    // Grant entitlement if successful agent payment
    if (status === 'success' && transaction.agentId) {
      await this.grantEntitlement(
        transaction.userId,
        transaction.agentId,
        transaction.id,
      );
    }

    // Mark session as paid if successful session payment
    if (status === 'success' && transaction.sessionId) {
      await this.sessionsService.markSessionAsPaid(
        transaction.sessionId,
        transaction.id,
      );
    }

    this.logger.log(`Payment callback processed: ${externalId} - ${status}`);
  }

  /**
   * Manually process a payment and grant entitlement (admin use)
   */
  async manuallyProcessPayment(transactionId: string): Promise<void> {
    const transaction =
      await this.transactionsRepository.findById(transactionId);

    if (!transaction) {
      throw new NotFoundException(`Transaction ${transactionId} not found`);
    }

    // Update transaction status to success
    await this.transactionsRepository.update(transaction.id, {
      status: TransactionStatus.SUCCESS,
      completedAt: new Date(),
    });

    // Grant entitlement
    if (transaction.agentId) {
      await this.grantEntitlement(
        transaction.userId,
        transaction.agentId,
        transaction.id,
      );
    }

    this.logger.log(`Payment manually processed: ${transactionId}`);
  }

  /**
   * Grant entitlement to user for an agent
   */
  private async grantEntitlement(
    userId: string,
    agentId: string,
    transactionId: string,
  ): Promise<void> {
    // Check if entitlement already exists
    const existing = await this.entitlementsRepository.findByUserAndAgent(
      userId,
      agentId,
    );

    if (existing) {
      this.logger.log(
        `Entitlement already exists for user ${userId}, agent ${agentId}`,
      );
      return;
    }

    // Create entitlement (lifetime access for now)
    await this.entitlementsRepository.create({
      userId,
      agentId,
      transactionId,
      expiresAt: undefined, // Lifetime access
      isActive: true,
    });

    this.logger.log(
      `Entitlement granted to user ${userId} for agent ${agentId}`,
    );
  }

  /**
   * Sync payment status from Whish API
   * This is useful when callbacks fail - manually check and update status
   */
  async syncPaymentStatus(transactionId: string): Promise<PaymentResponseDto> {
    const transaction =
      await this.transactionsRepository.findById(transactionId);

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // If already completed, just return
    if (transaction.status === TransactionStatus.SUCCESS) {
      return this.mapToResponseDto(transaction);
    }

    // Get status from Whish
    const whishStatus = await this.whishService.getPaymentStatus({
      externalId: transaction.externalId,
      currency: transaction.currency as PaymentCurrency,
    });

    this.logger.log(
      `Synced payment status for ${transactionId}: ${whishStatus.collectStatus}`,
    );

    const newStatus = this.mapWhishStatus(whishStatus.collectStatus);

    // Update transaction
    await this.transactionsRepository.updateStatus(
      transactionId,
      newStatus,
      whishStatus.payerPhoneNumber,
    );

    // If success, grant entitlement for agent payments
    if (newStatus === TransactionStatus.SUCCESS && transaction.agentId) {
      await this.grantEntitlement(
        transaction.userId,
        transaction.agentId,
        transactionId,
      );
    }

    // If success, mark session as paid for session payments
    if (newStatus === TransactionStatus.SUCCESS && transaction.sessionId) {
      this.logger.log(
        `Marking session ${transaction.sessionId} as paid with transaction ${transactionId}`,
      );
      await this.sessionsService.markSessionAsPaid(
        transaction.sessionId,
        transactionId,
      );
    }

    // Get updated transaction
    const updated = await this.transactionsRepository.findById(transactionId);
    return this.mapToResponseDto(updated!);
  }

  /**
   * Sync all pending transactions
   */
  async syncAllPendingPayments(): Promise<{ synced: number; updated: number }> {
    const pending = await this.transactionsRepository.findByStatus(
      TransactionStatus.PENDING,
    );

    this.logger.log(
      `Syncing ${pending.length} pending transactions. SessionIds: ${pending
        .map((t) => t.sessionId)
        .filter(Boolean)
        .join(', ')}`,
    );

    let updated = 0;
    for (const transaction of pending) {
      try {
        this.logger.log(
          `Syncing transaction ${transaction.id}, sessionId: ${transaction.sessionId}, agentId: ${transaction.agentId}`,
        );
        const result = await this.syncPaymentStatus(transaction.id);
        if (result.status !== CollectStatus.PENDING) {
          this.logger.log(
            `Transaction ${transaction.id} updated to status: ${result.status}`,
          );
          updated++;
        }
      } catch (error) {
        this.logger.error(
          `Failed to sync transaction ${transaction.id}: ${error}`,
        );
      }
    }

    return { synced: pending.length, updated };
  }

  /**
   * Map Whish collect status to transaction status
   */
  private mapWhishStatus(collectStatus: CollectStatus): TransactionStatus {
    switch (collectStatus) {
      case CollectStatus.SUCCESS:
        return TransactionStatus.SUCCESS;
      case CollectStatus.FAILED:
        return TransactionStatus.FAILED;
      case CollectStatus.PENDING:
      default:
        return TransactionStatus.PENDING;
    }
  }

  /**
   * Map transaction entity to response DTO
   */
  private mapToResponseDto(transaction: Transaction): PaymentResponseDto {
    const metadata = transaction.metadata as { invoice?: string } | undefined;
    return {
      id: transaction.id,
      userId: transaction.userId,
      agentId: transaction.agentId ?? undefined,
      amount: transaction.amount,
      currency: transaction.currency as unknown as PaymentCurrency,
      status: transaction.status as unknown as CollectStatus,
      collectUrl: transaction.collectUrl,
      externalId: transaction.externalId,
      invoice: metadata?.invoice || '',
      payerPhoneNumber: transaction.payerPhoneNumber ?? undefined,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    };
  }

  /**
   * Get revenue stats for a creator's agents
   */
  async getCreatorRevenue(userId: string): Promise<{
    totalRevenue: number;
    transactionCount: number;
    revenueByAgent: {
      agentId: string;
      agentName?: string;
      revenue: number;
      count: number;
    }[];
  }> {
    // Get all agents owned by this user (uses findMyAgents which looks up creator profile)
    const agents = await this.agentsService.findMyAgents(userId);
    const agentIds = agents.map((a) => a.id);

    if (agentIds.length === 0) {
      return { totalRevenue: 0, transactionCount: 0, revenueByAgent: [] };
    }

    // Get revenue data
    const revenueData =
      await this.transactionsRepository.getRevenueByAgentIds(agentIds);

    // Add agent names
    const revenueByAgent = revenueData.revenueByAgent.map((r) => {
      const agent = agents.find((a) => a.id === r.agentId);
      return {
        ...r,
        agentName: agent?.name,
      };
    });

    return {
      totalRevenue: revenueData.totalRevenue,
      transactionCount: revenueData.transactionCount,
      revenueByAgent,
    };
  }
}
