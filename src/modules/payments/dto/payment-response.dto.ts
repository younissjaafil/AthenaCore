import { ApiProperty } from '@nestjs/swagger';
import { PaymentCurrency } from './create-payment.dto';
import { CollectStatus } from './payment-status.dto';

export class PaymentResponseDto {
  @ApiProperty({
    description: 'Transaction ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  userId: string;

  @ApiProperty({
    description: 'Agent ID (if payment for agent access)',
    example: '123e4567-e89b-12d3-a456-426614174002',
    required: false,
  })
  agentId?: string;

  @ApiProperty({
    description: 'Payment amount',
    example: 100.0,
  })
  amount: number;

  @ApiProperty({
    description: 'Payment currency',
    enum: PaymentCurrency,
    example: PaymentCurrency.USD,
  })
  currency: PaymentCurrency;

  @ApiProperty({
    description: 'Payment status',
    enum: CollectStatus,
    example: CollectStatus.PENDING,
  })
  status: CollectStatus;

  @ApiProperty({
    description: 'Whish payment URL',
    example: 'https://whish.money/pay/8nQS2mL',
  })
  collectUrl: string;

  @ApiProperty({
    description: 'External ID for tracking',
    example: '12345',
  })
  externalId: string;

  @ApiProperty({
    description: 'Payment invoice/description',
    example: 'Subscription to Premium Agent',
  })
  invoice: string;

  @ApiProperty({
    description: 'Payer phone number (available after payment)',
    example: '96170902894',
    required: false,
  })
  payerPhoneNumber?: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-01-15T10:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2025-01-15T10:05:00Z',
  })
  updatedAt: Date;
}
