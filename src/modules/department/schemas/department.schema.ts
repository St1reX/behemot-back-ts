import { z } from 'zod';

export const DepartmentIdSchema = z.object({
    id: z.string().uuid(),
});

export const CreateDepartmentSchema = z.object({
    name: z.string().min(1).max(100),
    shortcut: z.string().toUpperCase().min(1).max(2),
});

export type CreateDepartmentDTO = z.infer<typeof CreateDepartmentSchema>;

export const UpdateDepartmentSchema = CreateDepartmentSchema;

export type UpdateDepartmentDTO = z.infer<typeof UpdateDepartmentSchema>;
