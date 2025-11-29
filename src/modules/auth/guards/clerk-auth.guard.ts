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
    const secretKey = this.configService.clerkSecretKey;
    if (!secretKey) {
      console.error('CLERK_SECRET_KEY is not configured!');
      throw new Error('CLERK_SECRET_KEY environment variable is required');
    }
    console.log(
      'ClerkAuthGuard initialized with secret key:',
      secretKey.substring(0, 10) + '...',
    );
    this.clerkClient = createClerkClient({
      secretKey: secretKey,
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
      console.log('Verifying Clerk token...');
      const payload = await this.clerkClient.verifyToken(token);
      console.log('Token verified successfully. ClerkId:', payload.sub);

      const clerkId = payload.sub;
      if (!clerkId) {
        throw new UnauthorizedException('Invalid token payload');
      }

      // Find or create user from database
      // This ensures users are auto-created even without webhook setup
      console.log('Finding or creating user:', clerkId);
      const user = await this.usersService.findOrCreate({
        sub: clerkId as string,
        email: payload.email as string,
        firstName: (payload.given_name || payload.first_name) as string,
        lastName: (payload.family_name || payload.last_name) as string,
      });
      console.log('User loaded:', user.id);

      // Attach user to request
      request.user = user;

      return true;
    } catch (error) {
      console.error('Clerk token verification failed:', error);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
