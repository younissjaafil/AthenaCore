import {
  Controller,
  Post,
  Body,
  Headers,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  ClerkWebhookDto,
  ClerkUserWebhookData,
} from '../dto/clerk-webhook.dto';
import { UsersService } from 'src/modules/users/users.service';
import { ConfigService } from 'src/config/config.service';
import { Webhook } from 'svix';
import { Public } from 'src/common/decorators/public.decorator';

@ApiTags('Auth')
@Controller('auth')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('webhook/clerk')
  @ApiOperation({ summary: 'Handle Clerk webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleClerkWebhook(
    @Headers('svix-id') svixId: string,
    @Headers('svix-timestamp') svixTimestamp: string,
    @Headers('svix-signature') svixSignature: string,
    @Body() payload: ClerkWebhookDto,
  ) {
    // Verify webhook signature
    const webhookSecret = this.configService.clerkWebhookSecret;

    if (!webhookSecret) {
      this.logger.error('Clerk webhook secret not configured');
      throw new UnauthorizedException('Webhook secret not configured');
    }

    try {
      const wh = new Webhook(webhookSecret);
      const evt = wh.verify(JSON.stringify(payload), {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as ClerkWebhookDto;

      const { type, data } = evt;

      switch (type) {
        case 'user.created':
        case 'user.updated':
          await this.handleUserUpsert(data as ClerkUserWebhookData);
          break;

        case 'user.deleted':
          await this.handleUserDelete(data as ClerkUserWebhookData);
          break;

        default:
          this.logger.log(`Unhandled webhook event type: ${type}`);
      }

      return { success: true };
    } catch (error) {
      this.logger.error('Error verifying webhook:', error);
      throw new UnauthorizedException('Invalid webhook signature');
    }
  }

  private async handleUserUpsert(userData: ClerkUserWebhookData) {
    const email = userData.email_addresses?.[0]?.email_address;

    if (!email) {
      this.logger.warn(`User ${userData.id} has no email address`);
      return;
    }

    await this.usersService.syncFromClerk({
      clerkId: userData.id,
      email,
      firstName: userData.first_name,
      lastName: userData.last_name,
      profileImageUrl: userData.image_url,
    });

    this.logger.log(`Synced user ${email} from Clerk`);
  }

  private async handleUserDelete(userData: ClerkUserWebhookData) {
    try {
      const user = await this.usersService.findByClerkId(userData.id);
      if (user) {
        await this.usersService.remove(user.id);
        this.logger.log(`Deleted user ${user.email}`);
      }
    } catch (error) {
      this.logger.error(`Error deleting user ${userData.id}:`, error);
    }
  }
}
