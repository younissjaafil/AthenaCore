import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { verifyToken, createClerkClient } from '@clerk/backend';
import { ConfigService } from '../../../config/config.service';
import { UsersService } from '../../users/users.service';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private secretKey: string;
  private clerkClient: ReturnType<typeof createClerkClient>;

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
    this.secretKey = secretKey;
    this.clerkClient = createClerkClient({ secretKey });
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
      // Verify the token using Clerk's verifyToken function
      console.log('Verifying Clerk token...');
      const payload = await verifyToken(token, {
        secretKey: this.secretKey,
      });
      console.log('Token verified successfully. ClerkId:', payload.sub);

      const clerkId = payload.sub;
      if (!clerkId) {
        throw new UnauthorizedException('Invalid token payload');
      }

      // Find or create user from database
      // This ensures users are auto-created even without webhook setup
      console.log('Finding or creating user:', clerkId);

      // First try to find existing user
      let user = await this.usersService.findByClerkId(clerkId);

      if (!user) {
        // User doesn't exist, fetch details from Clerk API
        console.log('User not found, fetching from Clerk API...');
        const clerkUser = await this.clerkClient.users.getUser(clerkId);
        console.log(
          'Clerk user fetched:',
          clerkUser.emailAddresses?.[0]?.emailAddress,
        );

        user = await this.usersService.findOrCreate({
          sub: clerkId,
          email:
            clerkUser.emailAddresses?.[0]?.emailAddress ||
            `${clerkId}@placeholder.com`,
          firstName: clerkUser.firstName || undefined,
          lastName: clerkUser.lastName || undefined,
        });
      }

      console.log('User loaded:', user.id);

      // Attach user to request
      request.user = user;

      return true;
    } catch (error: any) {
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
