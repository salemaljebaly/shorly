/**
 * System roles enum
 * Defines all available roles in the system
 */
export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  SUPERVISOR = 'SUPERVISOR',
  USER = 'USER',
}

/**
 * Role hierarchy levels for comparison
 * Higher number = higher privileges
 */
export const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.USER]: 1,
  [Role.SUPERVISOR]: 2,
  [Role.ADMIN]: 3,
  [Role.SUPER_ADMIN]: 4,
};

/**
 * Helper function to check if one role can access another
 * @param userRole The role of the user
 * @param requiredRole The minimum required role
 * @returns true if userRole has equal or higher privileges
 */
export function canAccessRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Get all roles that are equal to or higher than the given role
 * @param role The base role
 * @returns Array of roles with equal or higher privileges
 */
export function getRolesWithEqualOrHigherPrivileges(role: Role): Role[] {
  const userLevel = ROLE_HIERARCHY[role];
  return Object.entries(ROLE_HIERARCHY)
    .filter(([_, level]) => level >= userLevel)
    .map(([roleName]) => roleName as Role);
}