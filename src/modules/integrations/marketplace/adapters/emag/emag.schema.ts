import { z } from 'zod';

export const EmagConfigurationSchema = z.object({
    username: z.string().trim().email('Podaj prawidłowy adres e-mail konta eMAG.').max(255),
    password: z.string().min(1, 'Podaj hasło konta eMAG.').max(4096),
}).strict();

export const EmagResponseSchema = z.object({
    isError: z.boolean(),
});
