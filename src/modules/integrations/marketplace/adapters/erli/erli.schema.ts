import { z } from 'zod';

export const ErliConfigurationSchema = z.object({
    token: z.string().trim().min(1, 'Podaj token API ERLI.').max(8192, 'Token jest zbyt długi.')
        .regex(/^\S+$/u, 'Token nie może zawierać białych znaków.'),
}).strict();
