import { z } from 'zod';
import { EmailSchema, PasswordSchema, UsernameSchema } from '../../../shared/schema/commonSchema';

export const LoginUserSchema = z.object({
    username: UsernameSchema,
    password: PasswordSchema,
});

export type LoginUserDTO = z.infer<typeof LoginUserSchema>;

export const RegisterUserSchema = LoginUserSchema.extend({
    email: EmailSchema,
});

export type RegisterUserDTO = z.infer<typeof RegisterUserSchema>;

export const ResendRegistrationMailSchema = z.object({
    email: EmailSchema,
});

export type ResendRegistrationMailDTO = z.infer<typeof ResendRegistrationMailSchema>;

export const VerifyAccountSchema = z.object({
    token: z.string({ required_error: 'W linku brakuje tokenu aktywacyjnego.' })
        .min(1, 'W linku brakuje tokenu aktywacyjnego.'),
});

export type VerifyAccountDTO = z.infer<typeof VerifyAccountSchema>;
