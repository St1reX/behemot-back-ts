import { throwErliError } from './erli.errors';
import { parseErliResponse } from './erli.response';
import { ErliShopSchema } from './erli.schema';

export class ErliApiClient {
    static async getShop(baseUrl: string, token: string) {
        try {
            const response = await fetch(new URL('me', baseUrl), {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                    'User-Agent': 'Behemot/1.0',
                },
                signal: AbortSignal.timeout(10_000),
                redirect: 'error',
            });

            return await parseErliResponse(response, ErliShopSchema);
        } catch (error) {
            throwErliError(error);
        }
    }
}
