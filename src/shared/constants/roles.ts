export const ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  DEPARTMENT_MANAGER: 'department_manager',
  USER: 'user',
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];
