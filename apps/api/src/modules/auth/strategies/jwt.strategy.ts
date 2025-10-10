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
    console.log('🔐 JWT Strategy - Entry point - Validating payload:', payload);
    try {
      const user = await this.authService.validateUser(payload.sub);
      console.log('🔍 JWT Strategy - User from validateUser:', {
        id: user?.id,
        email: user?.email,
        role: user?.role?.name,
        isActive: user?.isActive,
        suspendedAt: user?.suspendedAt
      });

    if (!user || !user.isActive) {
        console.log('❌ JWT Strategy - User not found or inactive');
        throw new UnauthorizedException('Invalid credentials');
      }

      // Check if user is suspended (unless this is an impersonation token for an admin)
      if (user.suspendedAt && !payload.isImpersonation) {
        console.log('❌ JWT Strategy - User suspended');
        throw new UnauthorizedException('Account suspended. Contact support.');
      }

      // Add impersonation metadata to user object if present
      if (payload.isImpersonation && payload.adminId) {
        (user as any).isImpersonation = true;
        (user as any).impersonatedBy = payload.adminId;
      }

      console.log('✅ JWT Strategy - Validation successful, returning user with role:', user.role?.name);
      return user;
    } catch (error) {
      console.log('❌ JWT Strategy - Error during validation:', error.message);
      throw error;
    }
  }
}
