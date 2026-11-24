import { z } from 'zod';
import { IdParamsSchema, UuidSchema } from '../../../shared/schema/commonSchema';

export const RoleIdSchema = IdParamsSchema;

export const CreateRoleSchema = z.object({
    name: z.string().trim().min(1).max(100),
    privilegeIds: z.array(UuidSchema).default([]),
});

export type CreateRoleDTO = z.infer<typeof CreateRoleSchema>;

export const UpdateRoleSchema = CreateRoleSchema.extend({
    privilegeIds: z.array(UuidSchema),
});

export type UpdateRoleDTO = z.infer<typeof UpdateRoleSchema>;

export const UpdateRolePrivilegesSchema = z.object({
    privilegeIds: z.array(UuidSchema).min(1),
});

export type UpdateRolePrivilegesDTO = z.infer<typeof UpdateRolePrivilegesSchema>;
