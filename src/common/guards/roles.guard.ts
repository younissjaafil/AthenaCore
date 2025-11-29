import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../constants/roles.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    // Check if user has any of the required roles
    // User has a single 'role' field, not an array
    if (!user) {
      return false;
    }

    // Check single role field
    if (requiredRoles.includes(user.role)) {
      return true;
    }

    // Also check isAdmin for admin-only endpoints
    if (requiredRoles.includes(UserRole.ADMIN) && user.isAdmin) {
      return true;
    }

    return false;
  }
}
