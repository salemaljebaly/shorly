import { APP_CONSTANTS } from '@shorly/config';

/**
 * Generate a random short code for links
 */
export function generateShortCode(length: number = APP_CONSTANTS.SHORT_CODE_LENGTH): string {
  const charset = APP_CONSTANTS.SHORT_CODE_CHARSET;
  let result = '';
  const randomValues = new Uint8Array(length);

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomValues);
  } else {
    // Fallback for Node.js
    const nodeCrypto = require('crypto');
    nodeCrypto.randomFillSync(randomValues);
  }

  for (let i = 0; i < length; i++) {
    result += charset[randomValues[i] % charset.length];
  }

  return result;
}

/**
 * Validate short code format
 */
export function isValidShortCode(code: string): boolean {
  if (!code || code.length < 3 || code.length > 50) {
    return false;
  }

  // Only alphanumeric, hyphens, and underscores
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  return validPattern.test(code);
}

/**
 * Sanitize custom short code
 */
export function sanitizeShortCode(code: string): string {
  return code
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 50);
}

/**
 * Check if short code is reserved
 */
export function isReservedShortCode(code: string): boolean {
  const reserved = [
    'api',
    'admin',
    'dashboard',
    'login',
    'signup',
    'logout',
    'settings',
    'analytics',
    'qr',
    'docs',
    'health',
    'status',
  ];

  return reserved.includes(code.toLowerCase());
}
