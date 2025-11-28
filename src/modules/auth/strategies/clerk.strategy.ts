import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '../../../config/config.service';
import { UsersService } from '../../users/users.service';

@Injectable()
export class ClerkStrategy extends PassportStrategy(Strategy, 'clerk') {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.clerkSecretKey,
      algorithms: ['RS256'],
    });
  }

  async validate(payload: any) {
    // Clerk JWT payload contains: sub (clerkId), email, etc.
    const clerkId = payload.sub;

    if (!clerkId) {
      throw new UnauthorizedException('Invalid token');
    }

    // Find user from database
    const user = await this.usersService.findByClerkId(clerkId);

    if (!user) {
      // User must be synced via webhook first
      throw new UnauthorizedException(
        'User not found. Please ensure webhook is configured in Clerk Dashboard.',
      );
    }

    return user;
  }
}
