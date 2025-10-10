import { SetMetadata } from '@nestjs/common';
import { Role } from '../enums/roles.enum';

/**
 * Metadata key for storing required roles
 */
export const ROLES_KEY = 'roles';

/**
 * Decorator to specify required roles for a route
 *
 * Usage:
 * ```typescript
 * @Roles(Role.ADMIN, Role.SUPER_ADMIN)
 * @Get('users')
 * async getAllUsers() {
 *   // Only ADMIN and SUPER_ADMIN can access
 * }
 * ```
 *
 * @param roles Array of roles that can access the route (OR logic)
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);