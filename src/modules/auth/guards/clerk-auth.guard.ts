import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createClerkClient } from '@clerk/backend';
import { ConfigService } from '../../../config/config.service';
import { UsersService } from '../../users/users.service';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private clerkClient: any;

  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    this.clerkClient = createClerkClient({
      secretKey: this.configService.clerkSecretKey,
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization;

    if (
      !authHeader ||
      typeof authHeader !== 'string' ||
      !authHeader.startsWith('Bearer ')
    ) {
      throw new UnauthorizedException('No bearer token provided');
    }

    const token = authHeader.substring(7);

    try {
      // Verify the token using Clerk's built-in verification
      const payload = await this.clerkClient.verifyToken(token);

      const clerkId = payload.sub;
      if (!clerkId) {
        throw new UnauthorizedException('Invalid token payload');
      }

      // Find or create user from database
      // This ensures users are auto-created even without webhook setup
      const user = await this.usersService.findOrCreate({
        sub: clerkId as string,
        email: payload.email as string,
        firstName: (payload.given_name || payload.first_name) as string,
        lastName: (payload.family_name || payload.last_name) as string,
      });

      // Attach user to request
      request.user = user;

      return true;
    } catch (error) {
      console.error('Clerk token verification failed:', error);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
