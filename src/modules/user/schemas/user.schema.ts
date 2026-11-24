import { z } from 'zod';
import { RegisterUserSchema } from '../../auth/schemas/auth.schema';

export const UserIdSchema = z.object({ id: z.string().uuid() });

export const UpdateUserSchema = RegisterUserSchema.omit({ password: true }).extend({
    username: z.string().trim().pipe(RegisterUserSchema.shape.username),
    email: z.string().trim().pipe(RegisterUserSchema.shape.email),
    roleId: z.string().uuid(),
    departmentId: z.string().uuid().nullable(),
    isActive: z.boolean(),
});

export const CreateUserSchema = UpdateUserSchema.extend({
    password: RegisterUserSchema.shape.password,
});

export type CreateUserDTO = z.infer<typeof CreateUserSchema>;
export type UpdateUserDTO = z.infer<typeof UpdateUserSchema>;
