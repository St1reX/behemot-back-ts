import { z } from 'zod';
import { EmailSchema, IdParamsSchema, PasswordSchema, UsernameSchema, UuidSchema } from '../../../shared/schema/commonSchema';

export const UserIdSchema = IdParamsSchema;

export const UpdateUserSchema = z.object({
    username: z.string().trim().pipe(UsernameSchema),
    email: z.string().trim().pipe(EmailSchema),
    roleId: UuidSchema,
    isActive: z.boolean(),
});

export const CreateUserSchema = UpdateUserSchema.extend({
    password: PasswordSchema,
});

export type CreateUserDTO = z.infer<typeof CreateUserSchema>;
export type UpdateUserDTO = z.infer<typeof UpdateUserSchema>;
