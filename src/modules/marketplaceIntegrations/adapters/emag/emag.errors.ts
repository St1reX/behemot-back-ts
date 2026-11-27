import { AppError, ErrorNames } from '../../../../errors/errorHandler';

export function throwEmagError(error: unknown): never {
    if (error instanceof AppError) throw error;
    throwEmagResponseError();
}

export function throwEmagResponseError(status?: number, isError = false): never {
    if (status === 401 || status === 403) {
        throw new AppError(ErrorNames.VALIDATION_ERROR, 422, 'eMAG odrzucił dostęp. Sprawdź e-mail, hasło, uprawnienia API i dozwolone IP serwera.');
    }
    if (status === 429) {
        throw new AppError(ErrorNames.TOO_MANY_REQUESTS, 429, 'eMAG ograniczył liczbę zapytań. Spróbuj ponownie później.');
    }
    if (isError) {
        throw new AppError(ErrorNames.VALIDATION_ERROR, 422, 'eMAG zgłosił błąd. Sprawdź e-mail, hasło, uprawnienia API i dozwolone IP serwera.');
    }
    throw new AppError(ErrorNames.EXTERNAL_SERVICE_ERROR, 502, 'API eMAG zwróciło błąd.');
}
