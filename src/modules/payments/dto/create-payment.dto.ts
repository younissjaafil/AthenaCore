import {
  IsNumber,
  IsString,
  IsEnum,
  IsUrl,
  IsOptional,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PaymentCurrency {
  LBP = 'LBP',
  USD = 'USD',
  AED = 'AED',
}

export class CreatePaymentDto {
  @ApiProperty({
    description: 'Amount to be paid by client',
    example: 100.0,
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({
    description: 'Payment currency',
    enum: PaymentCurrency,
    example: PaymentCurrency.USD,
  })
  @IsEnum(PaymentCurrency)
  currency: PaymentCurrency;

  @ApiProperty({
    description: 'Payment description/invoice details',
    example: 'Subscription to Premium Agent - React Expert',
  })
  @IsString()
  invoice: string;

  @ApiPropertyOptional({
    description: 'Success callback URL (GET)',
    example: 'https://athena-ai.pro/api/payments/callback/success',
  })
  @IsOptional()
  @IsUrl()
  successCallbackUrl?: string;

  @ApiPropertyOptional({
    description: 'Failure callback URL (GET)',
    example: 'https://athena-ai.pro/api/payments/callback/failure',
  })
  @IsOptional()
  @IsUrl()
  failureCallbackUrl?: string;

  @ApiPropertyOptional({
    description: 'Success redirect URL (GET)',
    example: 'https://athena-ai.pro/payment/success',
  })
  @IsOptional()
  @IsUrl()
  successRedirectUrl?: string;

  @ApiPropertyOptional({
    description: 'Failure redirect URL (GET)',
    example: 'https://athena-ai.pro/payment/failure',
  })
  @IsOptional()
  @IsUrl()
  failureRedirectUrl?: string;
}

export class WhishPaymentRequest extends CreatePaymentDto {
  @ApiProperty({ description: 'External transaction ID' })
  externalId: string;
}

export class WhishPaymentResponseDto {
  @ApiProperty({
    description: 'Whish payment page URL',
    example: 'https://whish.money/pay/8nQS2mL',
  })
  collectUrl: string;
}
