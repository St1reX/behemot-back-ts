import type { ZodType, ZodTypeDef } from 'zod';
import { throwErliResponseError } from './erli.errors';

export async function parseErliResponse<T>(response: Response, schema: ZodType<T, ZodTypeDef, unknown>): Promise<T> {
    if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        throwErliResponseError(response.status);
    }

    return schema.parse(await response.json());
}
