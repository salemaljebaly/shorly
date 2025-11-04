/**
 * System permissions enum
 * Defines all available permissions in the system
 */
export enum Permission {
  // User permissions
  USERS_READ = 'users:read',
  USERS_WRITE = 'users:write',
  USERS_DELETE = 'users:delete',
  USERS_IMPERSONATE = 'users:impersonate',
  USERS_SUSPEND = 'users:suspend',

  // Billing permissions
  BILLING_READ = 'billing:read',
  BILLING_WRITE = 'billing:write',
  BILLING_REFUND = 'billing:refund',

  // System permissions
  SYSTEM_READ = 'system:read',
  SYSTEM_WRITE = 'system:write',

  // Settings permissions
  SETTINGS_READ = 'settings:read',
  SETTINGS_WRITE = 'settings:write',

  // Role management
  ROLES_MANAGE = 'roles:manage',

  // Logs and audit
  LOGS_READ = 'logs:read',

  // Analytics permissions
  ANALYTICS_READ = 'analytics:read',
  ANALYTICS_EXPORT = 'analytics:export',

  // Content management
  CONTENT_READ = 'content:read',
  CONTENT_WRITE = 'content:write',
  CONTENT_DELETE = 'content:delete',

  // Support permissions
  SUPPORT_READ = 'support:read',
  SUPPORT_WRITE = 'support:write',
  SUPPORT_DELETE = 'support:delete',

  // FAQ permissions
  FAQ_READ = 'faq:read',
  FAQ_WRITE = 'faq:write',
  FAQ_DELETE = 'faq:delete',
}

/**
 * Permission categories for grouping
 */
export const PERMISSION_CATEGORIES = {
  USERS: {
    name: 'User Management',
    permissions: [
      Permission.USERS_READ,
      Permission.USERS_WRITE,
      Permission.USERS_DELETE,
      Permission.USERS_IMPERSONATE,
      Permission.USERS_SUSPEND,
    ],
  },
  BILLING: {
    name: 'Billing Management',
    permissions: [Permission.BILLING_READ, Permission.BILLING_WRITE, Permission.BILLING_REFUND],
  },
  SYSTEM: {
    name: 'System Administration',
    permissions: [
      Permission.SYSTEM_READ,
      Permission.SYSTEM_WRITE,
      Permission.SETTINGS_READ,
      Permission.SETTINGS_WRITE,
      Permission.ROLES_MANAGE,
    ],
  },
  LOGS: {
    name: 'Audit & Logs',
    permissions: [Permission.LOGS_READ],
  },
  ANALYTICS: {
    name: 'Analytics & Reports',
    permissions: [Permission.ANALYTICS_READ, Permission.ANALYTICS_EXPORT],
  },
  CONTENT: {
    name: 'Content Management',
    permissions: [Permission.CONTENT_READ, Permission.CONTENT_WRITE, Permission.CONTENT_DELETE],
  },
  SUPPORT: {
    name: 'Support Management',
    permissions: [Permission.SUPPORT_READ, Permission.SUPPORT_WRITE, Permission.SUPPORT_DELETE],
  },
  FAQ: {
    name: 'FAQ Management',
    permissions: [Permission.FAQ_READ, Permission.FAQ_WRITE, Permission.FAQ_DELETE],
  },
} as const;

/**
 * Get all permissions in a category
 * @param category The permission category
 * @returns Array of permissions in the category
 */
export function getPermissionsInCategory(
  category: keyof typeof PERMISSION_CATEGORIES
): Permission[] {
  return [...PERMISSION_CATEGORIES[category].permissions];
}

/**
 * Get all permissions across all categories
 * @returns Array of all permissions
 */
export function getAllPermissions(): Permission[] {
  return Object.values(Permission);
}

/**
 * Check if a permission string is valid
 * @param permission The permission to check
 * @returns true if the permission is valid
 */
export function isValidPermission(permission: string): permission is Permission {
  return Object.values(Permission).includes(permission as Permission);
}
