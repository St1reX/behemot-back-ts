import type { ZodType, ZodTypeDef } from 'zod';
import { throwPrestashopResponseError } from './prestashop.errors';

export async function parsePrestashopResponse<T>(response: Response, schema: ZodType<T, ZodTypeDef, unknown>): Promise<T> {
    if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        throwPrestashopResponseError(response.status);
    }

    return schema.parse(await response.json());
}
