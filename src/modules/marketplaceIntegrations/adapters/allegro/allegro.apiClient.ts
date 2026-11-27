import { AppError, ErrorNames } from '../../../../errors/errorHandler';
import { AllegroOAuthErrorSchema, AllegroTokenSchema, AllegroUserSchema } from './allegro.schema';

const oauthBaseUrl = 'https://allegro.pl/auth/oauth/';

export class AllegroApiClient {
    static getAuthorizationUrl(clientId: string, state: string, redirectUri: string) {
        const url = new URL('authorize', oauthBaseUrl);
        url.search = new URLSearchParams({
            response_type: 'code', client_id: clientId, redirect_uri: redirectUri,
            scope: 'allegro:api:profile:read', prompt: 'confirm', state,
        }).toString();
        return url.toString();
    }

    static async exchangeCode(code: string, clientId: string, clientSecret: string, redirectUri: string) {
        return this.requestTokens(new URLSearchParams({
            grant_type: 'authorization_code', code, redirect_uri: redirectUri,
        }), clientId, clientSecret);
    }

    static async refreshTokens(refreshToken: string, clientId: string, clientSecret: string) {
        return this.requestTokens(new URLSearchParams({
            grant_type: 'refresh_token', refresh_token: refreshToken,
        }), clientId, clientSecret);
    }

    private static async requestTokens(body: URLSearchParams, clientId: string, clientSecret: string) {
        const response = await this.request(new URL('token', oauthBaseUrl), {
            method: 'POST',
            headers: {
                Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
            },
            body,
        });
        const parsed = AllegroTokenSchema.safeParse(response);
        if (!parsed.success) {
            throw new AppError(ErrorNames.EXTERNAL_SERVICE_ERROR, 502, 'Allegro zwróciło nieprawidłową odpowiedź autoryzacji.');
        }
        return parsed.data;
    }

    static async getUser(baseUrl: string, accessToken: string) {
        const body = await this.request(new URL('me', baseUrl), {
            headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.allegro.public.v1+json' },
        });
        const parsed = AllegroUserSchema.safeParse(body);
        if (!parsed.success) {
            throw new AppError(ErrorNames.EXTERNAL_SERVICE_ERROR, 502, 'Allegro zwróciło nieprawidłowe dane konta.');
        }
        return parsed.data;
    }

    private static async request(url: URL, options: RequestInit): Promise<unknown> {
        let response: Response;
        let errorBody: unknown;
        try {
            response = await fetch(url, {
                ...options, signal: AbortSignal.timeout(10_000), redirect: 'error',
                headers: { ...options.headers, 'User-Agent': 'Behemot/1.0' },
            });
            if (response.ok) return await response.json();
            if (url.pathname === '/auth/oauth/token' && (response.status === 400 || response.status === 401)) {
                errorBody = await response.json().catch(() => undefined);
            } else {
                await response.body?.cancel();
            }
        } catch {
            throw new AppError(ErrorNames.EXTERNAL_SERVICE_ERROR, 502, 'Nie udało się połączyć z Allegro.');
        }
        // Provider bodies can contain credentials. Never return them or attach them to errors.
        const oauthError = AllegroOAuthErrorSchema.safeParse(errorBody);
        if (oauthError.success && oauthError.data.error === 'invalid_grant') {
            throw new AppError(ErrorNames.VALIDATION_ERROR, 422, 'Allegro odrzuciło kod lub token odświeżania. Połącz konto ponownie.');
        }
        if (oauthError.success && oauthError.data.error === 'invalid_client') {
            throw new AppError(ErrorNames.VALIDATION_ERROR, 422, 'Allegro odrzuciło dane aplikacji. Sprawdź Client ID i Client Secret.');
        }
        if (response.status === 401) {
            throw new AppError(ErrorNames.AUTHORIZATION_ERROR, 422, 'Allegro odrzuciło autoryzację. Połącz konto ponownie.');
        }
        if (response.status === 400 || response.status === 403) {
            throw new AppError(ErrorNames.VALIDATION_ERROR, 422, 'Allegro odrzuciło autoryzację. Sprawdź konfigurację aplikacji i połącz konto ponownie.');
        }
        if (response.status === 429) {
            throw new AppError(ErrorNames.TOO_MANY_REQUESTS, 429, 'Allegro ograniczyło liczbę zapytań. Spróbuj ponownie później.');
        }
        throw new AppError(ErrorNames.EXTERNAL_SERVICE_ERROR, 502, 'Allegro zwróciło błąd podczas sprawdzania połączenia.');
    }
}
