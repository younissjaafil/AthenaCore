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

    // Find or create user from Clerk data
    let user = await this.usersService.findByClerkId(clerkId);

    if (!user) {
      // Auto-create user if they don't exist yet
      user = await this.usersService.createFromClerk({
        clerkId,
        email: payload.email,
        firstName: payload.given_name,
        lastName: payload.family_name,
        profileImageUrl: payload.picture,
      });
    }

    return user;
  }
}
