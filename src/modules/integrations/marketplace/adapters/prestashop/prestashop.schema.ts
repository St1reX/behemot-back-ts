import { z } from 'zod';

export const PrestashopBaseUrlSchema = z.string().trim().url('Podaj prawidłowy adres sklepu.').max(2048)
    .refine((value) => {
        try {
            const url = new URL(value);
            return url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash;
        } catch {
            return false;
        }
    }, 'Podaj adres HTTPS bez danych logowania, parametrów i fragmentu URL.')
    .transform((value) => {
        const url = new URL(value);
        const path = url.pathname.replace(/\/+$/, '');
        url.pathname = path.endsWith('/api') ? `${path}/` : `${path}/api/`;
        return url.toString();
    });

export const PrestashopConfigurationSchema = z.object({
    baseUrl: PrestashopBaseUrlSchema,
    apiKey: z.string().trim().min(1, 'Podaj klucz API PrestaShop.').max(128)
        .regex(/^[a-z0-9]+$/i, 'Klucz API może zawierać wyłącznie litery i cyfry.'),
}).strict();

const identifierSchema = z.union([z.string().regex(/^\d+$/), z.number().int().nonnegative().safe()]).transform(String);
const booleanSchema = z.union([z.boolean(), z.literal('0'), z.literal('1'), z.literal(0), z.literal(1)])
    .transform((value) => value === true || value === '1' || value === 1);

export const PrestashopShopsSchema = z.object({
    shops: z.array(z.object({
        id: identifierSchema,
        name: z.string().trim().min(1).max(64),
        active: booleanSchema,
        id_shop_group: identifierSchema,
    })).min(1),
});
