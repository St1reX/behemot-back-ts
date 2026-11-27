import { throwEmagError } from './emag.errors';
import { parseEmagResponse } from './emag.response';
import { EmagResponseSchema } from './emag.schema';

export class EmagApiClient {
    static async checkConnection(baseUrl: string, username: string, password: string): Promise<void> {
        try {
            const response = await fetch(new URL('product_offer/count', baseUrl), {
                method: 'POST',
                headers: {
                    Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'User-Agent': 'Behemot/1.0',
                },
                body: JSON.stringify({}),
                signal: AbortSignal.timeout(10_000),
                redirect: 'error',
            });
            await parseEmagResponse(response, EmagResponseSchema);
        } catch (error) {
            throwEmagError(error);
        }
    }
}
