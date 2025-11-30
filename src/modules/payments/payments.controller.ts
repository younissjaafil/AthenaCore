import {
  Controller,
  Post,
  Get,
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
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('balance')
  @ApiBearerAuth()
  @UseGuards(ClerkAuthGuard)
  @ApiOperation({
    summary: 'Get account balance',
    description: 'Retrieve the current Whish account balance',
  })
  @ApiResponse({
    status: 200,
    description: 'Balance retrieved successfully',
    schema: {
      properties: {
        balance: { type: 'number', example: 217.718 },
      },
    },
  })
  async getBalance(): Promise<{ balance: number }> {
    return this.paymentsService.getBalance();
  }

  @Post('agent/:agentId')
  @ApiBearerAuth()
  @UseGuards(ClerkAuthGuard)
  @ApiOperation({
    summary: 'Create payment for agent access',
    description: 'Initiate payment to purchase access to an AI agent',
  })
  @ApiParam({ name: 'agentId', description: 'Agent ID' })
  @ApiResponse({
    status: 201,
    description: 'Payment created successfully',
    type: PaymentResponseDto,
  })
  async createAgentPayment(
    @CurrentUser('sub') userId: string,
    @Param('agentId') agentId: string,
    @Body() dto: CreatePaymentDto,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.createAgentPayment(userId, agentId, dto);
  }

  @Get('transactions')
  @ApiBearerAuth()
  @UseGuards(ClerkAuthGuard)
  @ApiOperation({
    summary: 'Get user transactions',
    description: 'List all payment transactions for the current user',
  })
  @ApiResponse({
    status: 200,
    description: 'Transactions retrieved successfully',
    type: [PaymentResponseDto],
  })
  async getUserTransactions(
    @CurrentUser('sub') userId: string,
  ): Promise<PaymentResponseDto[]> {
    return this.paymentsService.getUserTransactions(userId);
  }

  @Get('transactions/:id/status')
  @ApiBearerAuth()
  @UseGuards(ClerkAuthGuard)
  @ApiOperation({
    summary: 'Get payment status',
    description:
      'Check the status of a specific payment transaction (syncs with Whish)',
  })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiResponse({
    status: 200,
    description: 'Status retrieved successfully',
    type: PaymentResponseDto,
  })
  async getPaymentStatus(
    @Param('id') transactionId: string,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.getPaymentStatus(transactionId);
  }

  @Get('transactions/:id/invoice')
  @ApiBearerAuth()
  @UseGuards(ClerkAuthGuard)
  @ApiOperation({
    summary: 'Get invoice/payment URL',
    description: 'Get the Whish payment URL to open for a transaction',
  })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiResponse({
    status: 200,
    description: 'Invoice retrieved successfully',
    schema: {
      properties: {
        collectUrl: { type: 'string' },
        transactionId: { type: 'string' },
        amount: { type: 'number' },
        currency: { type: 'string' },
        status: { type: 'string' },
        agentId: { type: 'string' },
      },
    },
  })
  async getInvoice(@Param('id') transactionId: string) {
    return this.paymentsService.getInvoice(transactionId);
  }

  @Get('entitlements')
  @ApiBearerAuth()
  @UseGuards(ClerkAuthGuard)
  @ApiOperation({
    summary: 'Get user entitlements',
    description:
      'List all active agent access entitlements for the current user',
  })
  @ApiResponse({
    status: 200,
    description: 'Entitlements retrieved successfully',
    schema: {
      type: 'array',
      items: {
        properties: {
          id: { type: 'string' },
          agentId: { type: 'string' },
          agentName: { type: 'string' },
          expiresAt: { type: 'string', nullable: true },
          createdAt: { type: 'string' },
        },
      },
    },
  })
  async getUserEntitlements(@CurrentUser('sub') userId: string) {
    return this.paymentsService.getUserEntitlements(userId);
  }

  @Get('agent/:agentId/access')
  @ApiBearerAuth()
  @UseGuards(ClerkAuthGuard)
  @ApiOperation({
    summary: 'Check agent access',
    description:
      'Check if user has access to a specific agent and return pricing info',
  })
  @ApiParam({ name: 'agentId', description: 'Agent ID' })
  @ApiResponse({
    status: 200,
    description: 'Access status retrieved',
    schema: {
      properties: {
        hasAccess: { type: 'boolean' },
        isFree: { type: 'boolean' },
        pricePerMessage: { type: 'number' },
        pricePerConversation: { type: 'number' },
      },
    },
  })
  async checkAgentAccess(
    @CurrentUser('sub') userId: string,
    @Param('agentId') agentId: string,
  ): Promise<{
    hasAccess: boolean;
    isFree?: boolean;
    pricePerMessage?: number;
    pricePerConversation?: number;
  }> {
    return this.paymentsService.checkAgentAccess(userId, agentId);
  }

  @Post('transactions/:id/sync')
  @ApiBearerAuth()
  @UseGuards(ClerkAuthGuard)
  @ApiOperation({
    summary: 'Sync transaction status',
    description:
      'Check payment status with Whish and update transaction. Grants entitlement if successful.',
  })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiResponse({
    status: 200,
    description: 'Transaction synced successfully',
    type: PaymentResponseDto,
  })
  async syncTransactionStatus(
    @Param('id') transactionId: string,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.syncPaymentStatus(transactionId);
  }

  @Post('sync-all-pending')
  @ApiBearerAuth()
  @UseGuards(ClerkAuthGuard)
  @ApiOperation({
    summary: 'Sync all pending transactions',
    description:
      'Check payment status with Whish for all pending transactions and update them.',
  })
  @ApiResponse({
    status: 200,
    description: 'Transactions synced successfully',
    schema: {
      properties: {
        synced: { type: 'number' },
        updated: { type: 'number' },
      },
    },
  })
  async syncAllPendingTransactions(): Promise<{
    synced: number;
    updated: number;
  }> {
    return this.paymentsService.syncAllPendingPayments();
  }

  @Get('creator/revenue')
  @ApiBearerAuth()
  @UseGuards(ClerkAuthGuard)
  @ApiOperation({
    summary: 'Get creator revenue',
    description: 'Get total revenue and breakdown by agent for the creator',
  })
  @ApiResponse({
    status: 200,
    description: 'Revenue data retrieved successfully',
    schema: {
      properties: {
        totalRevenue: { type: 'number' },
        transactionCount: { type: 'number' },
        revenueByAgent: {
          type: 'array',
          items: {
            properties: {
              agentId: { type: 'string' },
              agentName: { type: 'string' },
              revenue: { type: 'number' },
              count: { type: 'number' },
            },
          },
        },
      },
    },
  })
  async getCreatorRevenue(@CurrentUser('sub') userId: string) {
    return this.paymentsService.getCreatorRevenue(userId);
  }

  @Post('callback/success')
  @Public()
  @ApiOperation({
    summary: 'Payment success callback',
    description: 'Webhook endpoint for successful payment notifications',
  })
  @ApiQuery({ name: 'externalId', type: 'string' })
  @ApiResponse({ status: 200, description: 'Callback processed' })
  async handleSuccessCallback(
    @Query('externalId') externalId: string,
  ): Promise<{ message: string }> {
    await this.paymentsService.handlePaymentCallback(externalId, 'success');
    return { message: 'Payment successful' };
  }

  @Post('callback/failure')
  @Public()
  @ApiOperation({
    summary: 'Payment failure callback',
    description: 'Webhook endpoint for failed payment notifications',
  })
  @ApiQuery({ name: 'externalId', type: 'string' })
  @ApiResponse({ status: 200, description: 'Callback processed' })
  async handleFailureCallback(
    @Query('externalId') externalId: string,
  ): Promise<{ message: string }> {
    await this.paymentsService.handlePaymentCallback(externalId, 'failure');
    return { message: 'Payment failed' };
  }

  @Post('admin/grant-entitlement/:transactionId')
  @ApiBearerAuth()
  @UseGuards(ClerkAuthGuard)
  @ApiOperation({
    summary: 'Manually grant entitlement',
    description:
      'Admin endpoint to manually process a successful payment and grant entitlement',
  })
  @ApiParam({ name: 'transactionId', description: 'Transaction ID' })
  @ApiResponse({ status: 200, description: 'Entitlement granted' })
  async manuallyGrantEntitlement(
    @Param('transactionId') transactionId: string,
  ): Promise<{ message: string }> {
    await this.paymentsService.manuallyProcessPayment(transactionId);
    return { message: 'Entitlement granted successfully' };
  }
}
