import { AppError, ErrorNames } from '../../../../errors/errorHandler';

export function throwPrestashopError(error: unknown): never {
    if (error instanceof AppError) throw error;
    throwPrestashopResponseError();
}

export function throwPrestashopResponseError(status?: number): never {
    if (status === 401 || status === 403) {
        throw new AppError(ErrorNames.VALIDATION_ERROR, 422, 'PrestaShop odrzucił klucz API. Sprawdź klucz i uprawnienie GET do zasobu shops.');
    }
    if (status === 429) {
        throw new AppError(ErrorNames.TOO_MANY_REQUESTS, 429, 'PrestaShop ograniczył liczbę zapytań. Spróbuj ponownie później.');
    }
    throw new AppError(ErrorNames.EXTERNAL_SERVICE_ERROR, 502, 'API PrestaShop zwróciło błąd.');
}
