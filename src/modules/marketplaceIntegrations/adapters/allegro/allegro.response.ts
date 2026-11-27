import type { ZodType, ZodTypeDef } from 'zod';
import { throwAllegroResponseError } from './allegro.errors';

export async function parseAllegroResponse<T>(response: Response, schema: ZodType<T, ZodTypeDef, unknown>): Promise<T> {
    if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        throwAllegroResponseError(response.status);
    }

    return schema.parse(await response.json());
}
