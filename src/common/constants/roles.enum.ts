// User roles - stored as array in DB
// Everyone has 'user', creators add 'creator', admins add 'admin'
export type UserRole = 'user' | 'creator' | 'admin';

// Valid roles array for validation
export const VALID_ROLES: UserRole[] = ['user', 'creator', 'admin'];

// Helper to check roles
export const hasRole = (roles: string[], role: UserRole): boolean => {
  return roles.includes(role);
};

export const isCreator = (roles: string[]): boolean =>
  hasRole(roles, 'creator');
export const isAdmin = (roles: string[]): boolean => hasRole(roles, 'admin');
