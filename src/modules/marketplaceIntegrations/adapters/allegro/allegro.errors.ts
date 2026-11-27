import { AppError, ErrorNames } from '../../../../errors/errorHandler';

export function throwAllegroError(error: unknown): never {
    if (error instanceof AppError) throw error;

    throwAllegroResponseError();
}

export function throwAllegroResponseError(status?: number): never {
    if (status === 401) {
        throw new AppError(
            ErrorNames.AUTHORIZATION_ERROR,
            422,
            'Allegro odrzuciło autoryzację. Połącz konto ponownie.',
        );
    }
    if (status === 400 || status === 403) {
        throw new AppError(
            ErrorNames.VALIDATION_ERROR,
            422,
            'Allegro odrzuciło żądanie. Sprawdź konfigurację i uprawnienia konta.',
        );
    }
    if (status === 429) {
        throw new AppError(
            ErrorNames.TOO_MANY_REQUESTS,
            429,
            'Allegro ograniczyło liczbę zapytań. Spróbuj ponownie później.',
        );
    }
    throw new AppError(ErrorNames.EXTERNAL_SERVICE_ERROR, 502, 'API Allegro zwróciło błąd.');
}
