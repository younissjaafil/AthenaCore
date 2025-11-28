import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from 'src/config/config.service';
import { UsersService } from 'src/modules/users/users.service';
import { User } from 'src/modules/users/entities/user.entity';

export interface JwtPayload {
  sub: string; // clerkId
  email: string;
  iat: number;
  exp: number;
}

@Injectable()
export class ClerkJwtStrategy extends PassportStrategy(Strategy, 'clerk-jwt') {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: async (
        _request: any,
        rawJwtToken: string,
        done: (err: any, secretOrKey?: string | Buffer) => void,
      ) => {
        try {
          // Clerk uses RS256 with JWKS, but for simplicity we'll use the secret
          // In production, you should verify using Clerk's JWKS endpoint
          const secret = this.configService.clerkSecretKey;
          done(null, secret);
        } catch (error) {
          done(error);
        }
      },
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    const { sub: clerkId } = payload;

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
