import { SetMetadata } from '@nestjs/common';
import { Permission } from '../enums/permissions.enum';

/**
 * Metadata key for storing required permissions (AND logic)
 */
export const PERMISSIONS_KEY = 'permissions';

/**
 * Metadata key for storing required permissions (OR logic)
 */
export const ANY_PERMISSION_KEY = 'any_permissions';

/**
 * Decorator to specify required permissions for a route (AND logic)
 * User must have ALL specified permissions to access the route
 *
 * Usage:
 * ```typescript
 * @RequirePermissions(Permission.USERS_WRITE, Permission.USERS_READ)
 * @Patch('users/:id')
 * async updateUser() {
 *   // Requires BOTH permissions
 * }
 * ```
 *
 * @param permissions Array of permissions that user must ALL have
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Decorator to specify required permissions for a route (OR logic)
 * User must have ANY of the specified permissions to access the route
 *
 * Usage:
 * ```typescript
 * @RequireAnyPermission(Permission.USERS_WRITE, Permission.BILLING_WRITE)
 * @Post('action')
 * async performAction() {
 *   // Requires ANY of the permissions
 * }
 * ```
 *
 * @param permissions Array of permissions that user must have at least one of
 */
export const RequireAnyPermission = (...permissions: Permission[]) =>
  SetMetadata(ANY_PERMISSION_KEY, permissions);