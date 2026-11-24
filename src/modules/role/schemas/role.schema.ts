import { z } from 'zod';

export const RoleIdSchema = z.object({
    id: z.string().uuid(),
});

export const CreateRoleSchema = z.object({
    name: z.string().trim().min(1).max(100),
    privilegeIds: z.array(z.string().uuid()).default([]),
});

export type CreateRoleDTO = z.infer<typeof CreateRoleSchema>;

export const UpdateRoleSchema = CreateRoleSchema.extend({
    privilegeIds: z.array(z.string().uuid()),
});

export type UpdateRoleDTO = z.infer<typeof UpdateRoleSchema>;

export const UpdateRolePrivilegesSchema = z.object({
    privilegeIds: z.array(z.string().uuid()).min(1),
});

export type UpdateRolePrivilegesDTO = z.infer<typeof UpdateRolePrivilegesSchema>;
