import { IsEnum, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentCurrency } from './create-payment.dto';

export enum CollectStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  PENDING = 'pending',
}

export class GetPaymentStatusDto {
  @ApiProperty({
    description: 'Payment currency',
    enum: PaymentCurrency,
    example: PaymentCurrency.USD,
  })
  @IsEnum(PaymentCurrency)
  currency: PaymentCurrency;

  @ApiProperty({
    description: 'External transaction ID',
    example: '12345',
  })
  @IsString()
  externalId: string;
}

export class WhishStatusResponseDto {
  @ApiProperty({
    description: 'Collection status',
    enum: CollectStatus,
    example: CollectStatus.SUCCESS,
  })
  collectStatus: CollectStatus;

  @ApiProperty({
    description: 'Phone number that performed the payment',
    example: '96170902894',
  })
  payerPhoneNumber: string;
}
