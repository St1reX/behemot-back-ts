import { AppError, ErrorNames } from '../../../../../errors/errorHandler';
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

        if (response.status === 401 || response.status === 403) {
            throw new AppError(ErrorNames.VALIDATION_ERROR, 422, 'eMAG odrzucił dostęp. Sprawdź e-mail, hasło, uprawnienia API i dozwolone IP serwera.');
        }
        if (response.status === 429) {
            throw new AppError(ErrorNames.TOO_MANY_REQUESTS, 429, 'eMAG ograniczył liczbę zapytań. Spróbuj ponownie później.');
        }
        if (!response.ok) {
            throw new AppError(ErrorNames.EXTERNAL_SERVICE_ERROR, 502, 'API eMAG zwróciło błąd podczas sprawdzania połączenia.');
        }
        const result = EmagResponseSchema.safeParse(body);
        if (!result.success) {
            throw new AppError(ErrorNames.EXTERNAL_SERVICE_ERROR, 502, 'eMAG zwrócił nieprawidłową odpowiedź.');
        }
        if (result.data.isError) {
            // Provider messages may contain request data; never return or log them verbatim.
            throw new AppError(ErrorNames.VALIDATION_ERROR, 422, 'eMAG zgłosił błąd. Sprawdź e-mail, hasło, uprawnienia API i dozwolone IP serwera.');
        }
    }
}
