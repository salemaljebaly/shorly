import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { AuthService } from '../auth.service';

interface JwtPayload {
  sub: string;
  email: string;
  isImpersonation?: boolean;
  adminId?: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || 'default-secret-change-in-production',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.authService.validateUser(payload.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is suspended (unless this is an impersonation token for an admin)
    if (user.suspendedAt && !payload.isImpersonation) {
      throw new UnauthorizedException('Account suspended. Contact support.');
    }

    // Add impersonation metadata to user object if present
    if (payload.isImpersonation && payload.adminId) {
      (user as any).isImpersonation = true;
      (user as any).impersonatedBy = payload.adminId;
    }

    return user;
  }
}
