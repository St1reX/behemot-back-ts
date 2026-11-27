import { AppError, ErrorNames } from '../../../../errors/errorHandler';

export function throwEmagResponseError(status: number): never {
    if (status === 401 || status === 403) {
        throw new AppError(ErrorNames.VALIDATION_ERROR, 422, 'eMAG odrzucił dostęp. Sprawdź e-mail, hasło, uprawnienia API i dozwolone IP serwera.');
    }
    if (status === 429) {
        throw new AppError(ErrorNames.TOO_MANY_REQUESTS, 429, 'eMAG ograniczył liczbę zapytań. Spróbuj ponownie później.');
    }
    throw new AppError(ErrorNames.EXTERNAL_SERVICE_ERROR, 502, 'API eMAG zwróciło błąd.');
}

export function assertEmagSuccess(isError: boolean): void {
    if (isError) {
        // eMAG can report a failure in HTTP 200. Provider messages may contain credentials.
        throw new AppError(ErrorNames.VALIDATION_ERROR, 422, 'eMAG zgłosił błąd. Sprawdź e-mail, hasło, uprawnienia API i dozwolone IP serwera.');
    }
}
