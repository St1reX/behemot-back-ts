import { AppError, ErrorNames } from '../../../../errors/errorHandler';

export function throwErliError(error: unknown): never {
    if (error instanceof AppError) throw error;
    throwErliResponseError();
}

export function throwErliResponseError(status?: number): never {
    if (status === 401 || status === 403) {
        throw new AppError(ErrorNames.VALIDATION_ERROR, 422, 'ERLI odrzuciło token API. Sprawdź jego poprawność i uprawnienia.');
    }
    if (status === 429) {
        throw new AppError(ErrorNames.TOO_MANY_REQUESTS, 429, 'ERLI ograniczyło liczbę zapytań. Spróbuj ponownie później.');
    }
    throw new AppError(ErrorNames.EXTERNAL_SERVICE_ERROR, 502, 'API ERLI zwróciło błąd.');
}
