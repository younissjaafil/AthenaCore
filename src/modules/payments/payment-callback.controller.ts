import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { PaymentsService } from './payments.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Payment Callbacks')
@Controller('payment')
export class PaymentCallbackController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('success')
  @Public()
  @ApiOperation({
    summary: 'Payment success callback',
    description:
      'Webhook endpoint for successful payment notifications from Whish',
  })
  @ApiQuery({ name: 'externalId', type: 'string', required: true })
  @ApiResponse({ status: 302, description: 'Redirects to success page' })
  async handleSuccessCallback(
    @Query('externalId') externalId: string,
    @Res() res: Response,
  ): Promise<void> {
    await this.paymentsService.handlePaymentCallback(externalId, 'success');

    // Redirect user to the frontend success page
    res.redirect('/student/payments/callback?status=success');
  }

  @Get('failure')
  @Public()
  @ApiOperation({
    summary: 'Payment failure callback',
    description: 'Webhook endpoint for failed payment notifications from Whish',
  })
  @ApiQuery({ name: 'externalId', type: 'string', required: true })
  @ApiResponse({ status: 302, description: 'Redirects to failure page' })
  async handleFailureCallback(
    @Query('externalId') externalId: string,
    @Res() res: Response,
  ): Promise<void> {
    await this.paymentsService.handlePaymentCallback(externalId, 'failure');

    // Redirect user to the frontend failure page
    res.redirect('/student/payments/callback?status=failed');
  }
}
