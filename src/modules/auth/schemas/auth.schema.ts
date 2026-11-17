import { z } from 'zod';

export const LoginUserSchema = z.object({
   email: z.string().email(),
   password: z.string().min(8),
});

export type LoginUserDTO = z.infer<typeof LoginUserSchema>;

export const RegisterUserSchema = z.object({
   email: z.string().email(),
   password: z.string().min(8),
   username: z.string().min(3).max(25),
});

export type RegisterUserDTO = z.infer<typeof RegisterUserSchema>;

export const ResendRegistrationMailSchema = z.object({
   email: z.string().email(),
});

export type ResendRegistrationMailDTO = z.infer<typeof ResendRegistrationMailSchema>;

export const VerifyAccountSchema = z.object({
   token: z.string().min(1),
});

export type VerifyAccountDTO = z.infer<typeof VerifyAccountSchema>;
