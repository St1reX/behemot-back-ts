import { AppError, ErrorNames } from '../../../../errors/errorHandler';
import { assertEmagSuccess, throwEmagResponseError } from './emag.errors';
import { EmagResponseSchema } from './emag.schema';

export class EmagApiClient {
    static async checkConnection(baseUrl: string, username: string, password: string): Promise<void> {
        let response: Response;
        let body: unknown;
        try {
            response = await fetch(new URL('product_offer/count', baseUrl), {
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
            if (response.ok) body = await response.json();
            else await response.body?.cancel();
        } catch {
            throw new AppError(ErrorNames.EXTERNAL_SERVICE_ERROR, 502, 'Nie udało się połączyć z API eMAG.');
        }

        if (!response.ok) throwEmagResponseError(response.status);
        const result = EmagResponseSchema.safeParse(body);
        if (!result.success) {
            throw new AppError(ErrorNames.EXTERNAL_SERVICE_ERROR, 502, 'eMAG zwrócił nieprawidłową odpowiedź.');
        }
        assertEmagSuccess(result.data.isError);
    }
}
