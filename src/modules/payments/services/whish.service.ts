/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';
import {
  WhishApiResponse,
  WhishBalanceResponseDto,
} from '../dto/whish-balance.dto';
import {
  WhishPaymentRequest,
  WhishPaymentResponseDto,
} from '../dto/create-payment.dto';
import {
  WhishStatusResponseDto,
  GetPaymentStatusDto,
} from '../dto/payment-status.dto';

@Injectable()
export class WhishService {
  private readonly logger = new Logger(WhishService.name);
  private readonly baseUrl: string;
  private readonly channel: string;
  private readonly secret: string;
  private readonly websiteUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.baseUrl = this.configService.get<string>('WHISH_BASE_URL') || '';
    this.channel = this.configService.get<string>('WHISH_CHANNEL', '');
    this.secret = this.configService.get<string>('WHISH_SECRET', '');
    this.websiteUrl = this.configService.get<string>('WHISH_WEBSITE_URL', '');

    this.logger.log(`Whish Service initialized with base URL: ${this.baseUrl}`);
  }

  /**
   * Get account balance from Whish
   */
  async getBalance(): Promise<number> {
    try {
      const response: AxiosResponse<
        WhishApiResponse<{ balanceDetails: WhishBalanceResponseDto }>
      > = await firstValueFrom(
        this.httpService.get<
          WhishApiResponse<{ balanceDetails: WhishBalanceResponseDto }>
        >(`${this.baseUrl}/payment/account/balance`, {
          headers: this.getHeaders(),
        }),
      );

      if (!response.data.status) {
        throw new HttpException(
          `Whish API error: ${response.data.code}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      this.logger.log(
        `Balance retrieved: ${response.data.data.balanceDetails.balance}`,
      );
      return response.data.data.balanceDetails.balance;
    } catch (error) {
      this.logger.error(
        `Failed to get balance: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new HttpException(
        'Failed to retrieve balance from payment gateway',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Create a payment request
   */
  async createPayment(
    request: WhishPaymentRequest,
  ): Promise<WhishPaymentResponseDto> {
    try {
      const response: AxiosResponse<WhishApiResponse<WhishPaymentResponseDto>> =
        await firstValueFrom(
          this.httpService.post<WhishApiResponse<WhishPaymentResponseDto>>(
            `${this.baseUrl}/payment/whish`,
            request,
            {
              headers: this.getHeaders(),
            },
          ),
        );

      if (!response.data.status) {
        this.logger.error(
          `Whish payment creation failed: ${response.data.code} - ${JSON.stringify(response.data.dialog)}`,
        );
        throw new HttpException(
          response.data.dialog?.message || 'Payment creation failed',
          HttpStatus.BAD_REQUEST,
        );
      }

      this.logger.log(
        `Payment created: ${request.externalId} - ${response.data.data.collectUrl}`,
      );
      return response.data.data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Failed to create payment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new HttpException(
        'Failed to create payment',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(
    request: GetPaymentStatusDto,
  ): Promise<WhishStatusResponseDto> {
    try {
      const response: AxiosResponse<WhishApiResponse<WhishStatusResponseDto>> =
        await firstValueFrom(
          this.httpService.post<WhishApiResponse<WhishStatusResponseDto>>(
            `${this.baseUrl}/payment/collect/status`,
            request,
            {
              headers: this.getHeaders(),
            },
          ),
        );

      if (!response.data.status) {
        throw new HttpException(
          `Whish API error: ${response.data.code}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      this.logger.log(
        `Payment status retrieved: ${request.externalId} - ${response.data.data.collectStatus}`,
      );
      return response.data.data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Failed to get payment status: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new HttpException(
        'Failed to retrieve payment status',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Get headers for Whish API requests
   */
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      channel: this.channel,
      secret: this.secret,
      websiteurl: this.websiteUrl,
    };
  }
}
