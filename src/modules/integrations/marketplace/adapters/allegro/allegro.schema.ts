import { z } from 'zod';
import { ApiBaseUrlSchema } from '../../schemas/apiBaseUrl.schema';

export const AllegroAuthorizationSchema = z.object({
    baseUrl: ApiBaseUrlSchema,
    clientId: z.string().trim().min(1, 'Podaj Client ID aplikacji Allegro.').max(255)
        .regex(/^[a-z0-9-]+$/i, 'Client ID może zawierać wyłącznie litery, cyfry i myślniki.'),
    clientSecret: z.string().trim().min(1, 'Podaj Client Secret aplikacji Allegro.').max(4096),
    integrationId: z.string().uuid().optional(),
}).strict();

export const AllegroCallbackSchema = z.object({
    state: z.string().regex(/^[a-f0-9]{64}$/),
    code: z.string().min(1).max(4096).optional(),
    error: z.string().max(255).optional(),
});

// Internal input, accepted only after consuming the session-bound OAuth state.
export const AllegroConfigurationSchema = AllegroAuthorizationSchema.omit({ integrationId: true }).extend({
    code: z.string().min(1).max(4096),
    redirectUri: z.string().url().max(2048),
}).strict();

export const AllegroOAuthStateSchema = AllegroAuthorizationSchema.extend({
    redirectUri: z.string().url().max(2048),
    sessionHash: z.string(),
    userId: z.string(),
});

export const AllegroTokenSchema = z.object({
    access_token: z.string().min(1),
    refresh_token: z.string().min(1),
    token_type: z.string().refine((value) => value.toLowerCase() === 'bearer'),
    expires_in: z.number().int().positive().max(86400),
});

export const AllegroOAuthErrorSchema = z.object({
    error: z.string(),
});

export const AllegroUserSchema = z.object({
    id: z.string().min(1).max(255),
    login: z.string().min(1).max(255),
});
