import { throwPrestashopError } from './prestashop.errors';
import { parsePrestashopResponse } from './prestashop.response';
import { PrestashopShopsSchema } from './prestashop.schema';

export class PrestashopApiClient {
    static async getFirstShop(baseUrl: string, apiKey: string) {
        try {
            const url = new URL('shops', baseUrl);
            url.search = new URLSearchParams({ display: 'full', output_format: 'JSON', limit: '1' }).toString();
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
                    Accept: 'application/json',
                    'User-Agent': 'Behemot/1.0',
                },
                signal: AbortSignal.timeout(10_000),
                redirect: 'error',
            });
            const data = await parsePrestashopResponse(response, PrestashopShopsSchema);
            return data.shops[0];
        } catch (error) {
            throwPrestashopError(error);
        }
    }
}
