import type { ZodType, ZodTypeDef } from 'zod';
import { throwEmagResponseError } from './emag.errors';

export async function parseEmagResponse<T extends { isError: boolean }>(response: Response, schema: ZodType<T, ZodTypeDef, unknown>): Promise<T> {
    if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        throwEmagResponseError(response.status);
    }

    const data = schema.parse(await response.json());
    if (data.isError) throwEmagResponseError(response.status, data.isError);
    return data;
}
