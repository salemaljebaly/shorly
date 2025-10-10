import { SetMetadata } from '@nestjs/common';
import { AdminLoggingMetadata, AdminLogAction, AdminLogTargetType } from '../admin-logging.service';

/**
 * Metadata key for admin logging configuration
 */
export const ADMIN_LOGGING_KEY = 'admin_logging';

/**
 * Decorator to configure admin logging for a controller method
 *
 * Usage:
 * ```typescript
 * @AdminLog({
 *   action: AdminLogAction.VIEW_USER,
 *   targetType: AdminLogTargetType.USER,
 *   targetIdParam: 'id', // Extract from request.params.id
 *   logRequest: true,
 *   logResponse: false,
 *   sensitiveFields: ['password', 'token']
 * })
 * @Get('users/:id')
 * async getUser(@Param('id') id: string) {
 *   // This action will be automatically logged
 * }
 * ```
 *
 * @param metadata The logging configuration
 */
export const AdminLog = (metadata: AdminLoggingMetadata) =>
  SetMetadata(ADMIN_LOGGING_KEY, metadata);

/**
 * Simplified decorator for common admin actions
 *
 * Usage:
 * ```typescript
 * @LogUserAction('VIEW_USER')
 * @Get('users/:id')
 * async getUser(@Param('id') id: string) {
 *   // Simple logging configuration
 * }
 * ```
 *
 * @param action The admin action
 * @param targetType Optional target type
 * @param targetIdParam Optional parameter name for target ID
 */
export const LogUserAction = (
  action: AdminLogAction,
  targetType?: AdminLogTargetType,
  targetIdParam?: string
) =>
  AdminLog({
    action,
    targetType,
    targetIdParam,
    logRequest: false,
    logResponse: false,
  });

/**
 * Decorator for logging user management actions
 */
export const LogUserManagement = (action: AdminLogAction, targetIdParam: string = 'id') =>
  AdminLog({
    action,
    targetType: AdminLogTargetType.USER,
    targetIdParam,
    logRequest: true,
    logResponse: false,
    sensitiveFields: ['password', 'refreshToken'],
  });

/**
 * Decorator for logging billing actions
 */
export const LogBillingAction = (action: AdminLogAction, targetIdParam: string = 'id') =>
  AdminLog({
    action,
    targetType: AdminLogTargetType.SUBSCRIPTION,
    targetIdParam,
    logRequest: true,
    logResponse: true,
    sensitiveFields: ['creditCard', 'bankAccount'],
  });

/**
 * Decorator for logging support actions
 */
export const LogSupportAction = (action: AdminLogAction, targetIdParam: string = 'id') =>
  AdminLog({
    action,
    targetType: AdminLogTargetType.TICKET,
    targetIdParam,
    logRequest: true,
    logResponse: true,
    sensitiveFields: ['userEmail', 'userPhone'],
  });