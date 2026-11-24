export const ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  USER: 'user',
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];
