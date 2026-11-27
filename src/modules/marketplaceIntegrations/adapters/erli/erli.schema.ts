import { z } from 'zod';
import { ApiBaseUrlSchema } from '../../schemas/apiBaseUrl.schema';

export const ErliConfigurationSchema = z.object({
    baseUrl: ApiBaseUrlSchema,
    token: z.string().trim().min(1, 'Podaj token API ERLI.').max(8192, 'Token jest zbyt długi.')
        .regex(/^\S+$/u, 'Token nie może zawierać białych znaków.'),
}).strict();

export const ErliShopSchema = z.object({
    id: z.number().int().nonnegative().safe(),
    name: z.string().trim().min(1).max(64),
    active: z.boolean(),
    scopes: z.array(z.string().min(1)),
    markets: z.array(z.string().min(1)),
});
