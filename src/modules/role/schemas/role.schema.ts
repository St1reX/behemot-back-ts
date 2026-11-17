import { z } from 'zod';

export const RoleIdSchema = z.object({
    id: z.string().uuid(),
});

export const CreateRoleSchema = z.object({
    name: z.string().min(1).max(100),
});

export type CreateRoleDTO = z.infer<typeof CreateRoleSchema>;

export const UpdateRolePrivilegesSchema = z.object({
    privilegeIds: z.array(z.string().uuid()).min(1),
});

export type UpdateRolePrivilegesDTO = z.infer<typeof UpdateRolePrivilegesSchema>;
