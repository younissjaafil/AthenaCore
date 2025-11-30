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
  Currency,
} from './entities/transaction.entity';
import { AgentsService } from '../agents/agents.service';

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

    // Set default callback/redirect URLs if not provided
    const baseUrl = this.configService.get<string>(
      'WHISH_WEBSITE_URL',
      'athena-ai.pro',
    );
    const successCallbackUrl =
      dto.successCallbackUrl ||
      `https://${baseUrl}/api/payments/callback/success`;
    const failureCallbackUrl =
      dto.failureCallbackUrl ||
      `https://${baseUrl}/api/payments/callback/failure`;
    const successRedirectUrl =
      dto.successRedirectUrl || `https://${baseUrl}/payment/success`;
    const failureRedirectUrl =
      dto.failureRedirectUrl || `https://${baseUrl}/payment/failure`;

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
      type: TransactionType.AGENT_PURCHASE,
      amount: dto.amount,
      currency: dto.currency as unknown as Currency,
      status: TransactionStatus.PENDING,
      invoice: dto.invoice,
      collectUrl: whishResponse.collectUrl,
      metadata: {
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
   * Get payment status and update transaction
   */
  async getPaymentStatus(transactionId: string): Promise<PaymentResponseDto> {
    const transaction =
      await this.transactionsRepository.findById(transactionId);

    if (!transaction) {
      throw new NotFoundException(`Transaction ${transactionId} not found`);
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
      this.logger.error(`Error checking agent access: ${error.message}`);
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
    externalId: number,
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

    // Grant entitlement if successful
    if (status === 'success' && transaction.agentId) {
      await this.grantEntitlement(
        transaction.userId,
        transaction.agentId,
        transaction.id,
      );
    }

    this.logger.log(`Payment callback processed: ${externalId} - ${status}`);
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
    return {
      id: transaction.id,
      userId: transaction.userId,
      agentId: transaction.agentId ?? undefined,
      amount: transaction.amount,
      currency: transaction.currency as unknown as PaymentCurrency,
      status: transaction.status as unknown as CollectStatus,
      collectUrl: transaction.collectUrl,
      externalId: transaction.externalId,
      invoice: transaction.invoice,
      payerPhoneNumber: transaction.payerPhoneNumber ?? undefined,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    };
  }
}
