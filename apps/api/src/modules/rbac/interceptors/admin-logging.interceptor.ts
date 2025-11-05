import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';
import { AdminLoggingService, AdminLoggingMetadata } from '../admin-logging.service';

interface AuthenticatedRequest extends Request {
  user?: any; // User object with id property
}

/**
 * Metadata key for admin logging configuration
 */
export const ADMIN_LOGGING_KEY = 'admin_logging';

/**
 * Interceptor to automatically log admin actions
 * This interceptor will log all admin actions based on controller metadata
 */
@Injectable()
export class AdminLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AdminLoggingInterceptor.name);

  constructor(
    private adminLoggingService: AdminLoggingService,
    private reflector: Reflector
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    // Only log if user is authenticated
    if (!user || !user.id) {
      return next.handle();
    }

    // Get admin logging metadata from controller/handler
    const loggingMetadata = this.getLoggingMetadata(context);

    // If no logging metadata, skip logging
    if (!loggingMetadata) {
      return next.handle();
    }

    const startTime = Date.now();
    let responseData: any;

    return next.handle().pipe(
      tap({
        next: (response) => {
          // Store response for logging
          responseData = response;
          this.logAdminAction(context, loggingMetadata, user.id, request, responseData, startTime);
        },
        error: (error) => {
          // Log failed actions as well
          this.logAdminAction(context, loggingMetadata, user.id, request, null, startTime, error);
        },
      })
    );
  }

  /**
   * Get admin logging metadata from controller or handler
   * @param context The execution context
   * @returns AdminLoggingMetadata | null
   */
  private getLoggingMetadata(context: ExecutionContext): AdminLoggingMetadata | null {
    return (
      this.reflector.get(ADMIN_LOGGING_KEY, context.getHandler()) ||
      this.reflector.get(ADMIN_LOGGING_KEY, context.getClass())
    );
  }

  /**
   * Log the admin action
   * @param context The execution context
   * @param metadata The logging metadata
   * @param adminId The admin user ID
   * @param request The HTTP request
   * @param response The response data (optional)
   * @param startTime The request start time
   * @param error Optional error if request failed
   */
  private async logAdminAction(
    context: ExecutionContext,
    metadata: AdminLoggingMetadata,
    adminId: string,
    request: Request,
    response: any,
    startTime: number,
    error?: Error
  ) {
    try {
      const duration = Date.now() - startTime;
      const targetId = this.extractTargetId(request, metadata);

      // Prepare metadata for logging
      const logMetadata: Record<string, any> = {
        method: request.method,
        endpoint: request.url,
        duration,
        success: !error,
      };

      // Add request data if configured
      if (metadata.logRequest && request.body) {
        logMetadata.request = this.sanitizeData(request.body, metadata.sensitiveFields);
      }

      // Add response data if configured
      if (metadata.logResponse && response) {
        logMetadata.response = this.sanitizeData(response, metadata.sensitiveFields);
      }

      // Add error information if present
      if (error) {
        logMetadata.error = {
          message: error.message,
          stack: error.stack,
        };
      }

      // Add query parameters if any
      if (Object.keys(request.query || {}).length > 0) {
        logMetadata.query = request.query;
      }

      // Log the action
      await this.adminLoggingService.logAction({
        adminId,
        action: metadata.action,
        targetId,
        targetType: metadata.targetType,
        metadata: logMetadata,
        ipAddress: this.getClientIp(request),
      });

      this.logger.debug(`Admin action logged: ${metadata.action} by ${adminId}`);
    } catch (loggingError) {
      // Never let logging errors break the main flow
      this.logger.error('Failed to log admin action:', loggingError);
    }
  }

  /**
   * Extract target ID from request based on metadata configuration
   * @param request The HTTP request
   * @param metadata The logging metadata
   * @returns string | undefined
   */
  private extractTargetId(
    request: AuthenticatedRequest,
    metadata: AdminLoggingMetadata
  ): string | undefined {
    // Use custom function if provided
    if (metadata.getTargetId) {
      return metadata.getTargetId(request);
    }

    // Use parameter name if provided
    if (metadata.targetIdParam && request.params) {
      return request.params[metadata.targetIdParam];
    }

    // Try to extract from request body for common patterns
    if (request.body) {
      return (
        request.body.id ||
        request.body.userId ||
        request.body.subscriptionId ||
        request.body.ticketId ||
        request.body.faqId
      );
    }

    // Try to extract from query parameters
    if (request.query) {
      return (request.query.id ||
        request.query.userId ||
        request.query.subscriptionId ||
        request.query.ticketId ||
        request.query.faqId) as string;
    }

    return undefined;
  }

  /**
   * Sanitize data by removing sensitive fields
   * @param data The data to sanitize
   * @param sensitiveFields Array of field names to remove
   * @returns Sanitized data
   */
  private sanitizeData(data: any, sensitiveFields: string[] = []): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    // Default sensitive fields
    const defaultSensitiveFields = [
      'password',
      'token',
      'apiKey',
      'secret',
      'refreshToken',
      'accessToken',
      'creditCard',
      'ssn',
      'socialSecurityNumber',
    ];

    const fieldsToRemove = [...defaultSensitiveFields, ...sensitiveFields];

    // Create a deep copy and remove sensitive fields
    const sanitized = JSON.parse(JSON.stringify(data));
    this.removeFields(sanitized, fieldsToRemove);

    return sanitized;
  }

  /**
   * Recursively remove sensitive fields from object
   * @param obj The object to clean
   * @param fieldsToRemove Array of field names to remove
   */
  private removeFields(obj: any, fieldsToRemove: string[]): void {
    if (!obj || typeof obj !== 'object') {
      return;
    }

    // Remove sensitive fields from current level
    for (const field of fieldsToRemove) {
      if (Object.prototype.hasOwnProperty.call(obj, field)) {
        obj[field] = '[REDACTED]';
      }
    }

    // Recursively clean nested objects
    for (const key in obj) {
      if (obj[key] && typeof obj[key] === 'object') {
        this.removeFields(obj[key], fieldsToRemove);
      }
    }
  }

  /**
   * Extract client IP from request
   * @param request The HTTP request object
   * @returns string The client IP address
   */
  private getClientIp(request: AuthenticatedRequest): string {
    const forwarded = request.headers['x-forwarded-for'] as string;
    const realIp = request.headers['x-real-ip'] as string;

    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    if (realIp) {
      return realIp;
    }

    return request.ip || request.connection.remoteAddress || 'unknown';
  }
}
