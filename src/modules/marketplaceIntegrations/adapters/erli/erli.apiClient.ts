import { AppError, ErrorNames } from '../../../../errors/errorHandler';
import { throwErliResponseError } from './erli.errors';
import { ErliShopSchema } from './erli.schema';

export class ErliApiClient {
    static async getShop(baseUrl: string, token: string) {
        let response: Response;
        let body: unknown;

        try {
            response = await fetch(new URL('me', baseUrl), {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                    'User-Agent': 'Behemot/1.0',
                },
                signal: AbortSignal.timeout(10_000),
                redirect: 'error',
            });

            if (response.ok) body = await response.json();
            else await response.body?.cancel();
        } catch {
            // Do not propagate request objects or provider bodies containing credentials.
            throw new AppError(ErrorNames.EXTERNAL_SERVICE_ERROR, 502, 'Nie udało się pobrać danych konta z ERLI.');
        }

        if (!response.ok) throwErliResponseError(response.status);

        const result = ErliShopSchema.safeParse(body);
        if (!result.success) {
            throw new AppError(ErrorNames.EXTERNAL_SERVICE_ERROR, 502, 'ERLI zwróciło nieprawidłowe dane konta.');
        }

        return result.data;
    }
}
