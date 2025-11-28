import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('webhook/clerk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Clerk webhooks for user sync' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleClerkWebhook(@Body() webhookData: any) {
    // Note: In production, you should verify the webhook signature from Clerk
    // using the webhook secret (CLERK_WEBHOOK_SECRET)
    await this.authService.handleClerkWebhook(webhookData);
    return { success: true };
  }
}
