import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService) {}

  async handleClerkWebhook(webhookData: any): Promise<User> {
    const { type, data } = webhookData;

    switch (type) {
      case 'user.created':
      case 'user.updated':
        return this.usersService.syncFromClerk(data);

      case 'user.deleted':
        // Handle user deletion if needed
        if (data.id) {
          const user = await this.usersService.findByClerkId(data.id);
          if (user) {
            await this.usersService.remove(user.id);
          }
        }
        return null;

      default:
        console.log(`Unhandled Clerk webhook type: ${type}`);
        return null;
    }
  }

  async validateClerkUser(clerkId: string): Promise<User> {
    const user = await this.usersService.findByClerkId(clerkId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }
    return user;
  }
}
