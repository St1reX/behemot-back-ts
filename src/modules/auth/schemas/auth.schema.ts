import { z } from 'zod';

export const LoginUserSchema = z.object({
    username: z.string()
        .min(3, 'Nazwa użytkownika musi mieć co najmniej 3 znaki.')
        .max(25, 'Nazwa użytkownika może mieć najwyżej 25 znaków.'),
    password: z.string().min(8, 'Hasło musi mieć co najmniej 8 znaków.'),
});

export type LoginUserDTO = z.infer<typeof LoginUserSchema>;

export const RegisterUserSchema = LoginUserSchema.extend({
    email: z.string().email(),
});

export type RegisterUserDTO = z.infer<typeof RegisterUserSchema>;

export const ResendRegistrationMailSchema = z.object({
    email: z.string().email(),
});

export type ResendRegistrationMailDTO = z.infer<typeof ResendRegistrationMailSchema>;

export const VerifyAccountSchema = z.object({
    token: z.string({ required_error: 'W linku brakuje tokenu aktywacyjnego.' })
        .min(1, 'W linku brakuje tokenu aktywacyjnego.'),
});

export type VerifyAccountDTO = z.infer<typeof VerifyAccountSchema>;
