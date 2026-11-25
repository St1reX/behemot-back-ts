import { z } from 'zod';
import { IdParamsSchema } from '../../../shared/schema/commonSchema';

export const DepartmentIdSchema = IdParamsSchema;

export const CreateDepartmentSchema = z.object({
    name: z.string().trim().min(1).max(100),
    shortcut: z.string().trim().toUpperCase().min(1).max(2),
});

export type CreateDepartmentDTO = z.infer<typeof CreateDepartmentSchema>;

export const UpdateDepartmentSchema = CreateDepartmentSchema;

export type UpdateDepartmentDTO = z.infer<typeof UpdateDepartmentSchema>;
