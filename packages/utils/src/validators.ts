/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitize URL to prevent injection
 */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Invalid protocol');
    }
    return parsed.toString();
  } catch {
    throw new Error('Invalid URL');
  }
}

/**
 * Check if URL is safe (not pointing to private/internal networks)
 */
export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    // Block localhost and private IPs
    const unsafePatterns = [
      /^localhost$/i,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^169\.254\./, // Link-local
      /^::1$/, // IPv6 localhost
      /^fc00:/, // IPv6 private
      /^fe80:/, // IPv6 link-local
    ];

    return !unsafePatterns.some((pattern) => pattern.test(hostname));
  } catch {
    return false;
  }
}
