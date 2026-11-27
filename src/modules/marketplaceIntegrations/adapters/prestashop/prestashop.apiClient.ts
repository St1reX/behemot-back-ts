import { AppError, ErrorNames } from '../../../../errors/errorHandler';
import { throwPrestashopResponseError } from './prestashop.errors';
import { PrestashopShopsSchema } from './prestashop.schema';

export class PrestashopApiClient {
    static async getFirstShop(baseUrl: string, apiKey: string) {
        const url = new URL('shops', baseUrl);
        url.search = new URLSearchParams({ display: 'full', output_format: 'JSON', limit: '1' }).toString();
        let response: Response;
        let body: unknown;

        try {
            response = await fetch(url, {
                method: 'GET',
                headers: {
                    Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
                    Accept: 'application/json',
                    'User-Agent': 'Behemot/1.0',
                },
                signal: AbortSignal.timeout(10_000),
                redirect: 'error',
            });
            if (response.ok) body = await response.json();
            else await response.body?.cancel();
        } catch {
            throw new AppError(ErrorNames.EXTERNAL_SERVICE_ERROR, 502, 'Nie udało się pobrać danych sklepu PrestaShop.');
        }

        if (!response.ok) throwPrestashopResponseError(response.status);

        const result = PrestashopShopsSchema.safeParse(body);
        if (!result.success) {
            throw new AppError(ErrorNames.EXTERNAL_SERVICE_ERROR, 502, 'PrestaShop nie zwrócił poprawnych danych sklepu. Sprawdź adres i uprawnienie GET do zasobu shops.');
        }
        return result.data.shops[0];
    }
}
