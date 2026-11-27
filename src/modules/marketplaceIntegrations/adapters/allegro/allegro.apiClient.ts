import { AppError, ErrorNames } from '../../../../errors/errorHandler';
import { throwAllegroResponseError } from './allegro.errors';
import { AllegroOAuthErrorSchema, AllegroTokenSchema, AllegroUserSchema } from './allegro.schema';

export class AllegroApiClient {
    static getAuthorizationUrl(clientId: string, state: string, redirectUri: string) {
        const url = new URL('https://allegro.pl/auth/oauth/authorize');
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
        let response: Response;
        let responseBody: unknown;
        try {
            response = await fetch('https://allegro.pl/auth/oauth/token', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
                    'User-Agent': 'Behemot/1.0',
                },
                body,
                signal: AbortSignal.timeout(10_000),
                redirect: 'error',
            });
            if (response.ok) {
                responseBody = await response.json();
            } else if (response.status === 400 || response.status === 401) {
                responseBody = await response.json().catch(() => undefined);
            } else {
                await response.body?.cancel();
            }
        } catch {
            throw new AppError(ErrorNames.EXTERNAL_SERVICE_ERROR, 502, 'Nie udało się połączyć z Allegro.');
        }

        if (!response.ok) {
            // OAuth failures must not trigger the adapter's retry for resource API 401s.
            const oauthError = AllegroOAuthErrorSchema.safeParse(responseBody);
            if (oauthError.success && oauthError.data.error === 'invalid_grant') {
                throw new AppError(ErrorNames.VALIDATION_ERROR, 422, 'Allegro odrzuciło kod lub token odświeżania. Połącz konto ponownie.');
            }
            if (oauthError.success && oauthError.data.error === 'invalid_client') {
                throw new AppError(ErrorNames.VALIDATION_ERROR, 422, 'Allegro odrzuciło dane aplikacji. Sprawdź Client ID i Client Secret.');
            }
            if (response.status === 400 || response.status === 401 || response.status === 403) {
                throw new AppError(ErrorNames.VALIDATION_ERROR, 422, 'Allegro odrzuciło autoryzację. Sprawdź konfigurację aplikacji i połącz konto ponownie.');
            }
            throwAllegroResponseError(response.status);
        }

        const parsed = AllegroTokenSchema.safeParse(responseBody);
        if (!parsed.success) {
            throw new AppError(ErrorNames.EXTERNAL_SERVICE_ERROR, 502, 'Allegro zwróciło nieprawidłową odpowiedź autoryzacji.');
        }
        return parsed.data;
    }

    static async getUser(baseUrl: string, accessToken: string) {
        let response: Response;
        let body: unknown;
        try {
            response = await fetch(new URL('me', baseUrl), {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'application/vnd.allegro.public.v1+json',
                    'User-Agent': 'Behemot/1.0',
                },
                signal: AbortSignal.timeout(10_000),
                redirect: 'error',
            });
            if (response.ok) body = await response.json();
            else await response.body?.cancel();
        } catch {
            throw new AppError(ErrorNames.EXTERNAL_SERVICE_ERROR, 502, 'Nie udało się połączyć z Allegro.');
        }

        if (!response.ok) throwAllegroResponseError(response.status);

        const parsed = AllegroUserSchema.safeParse(body);
        if (!parsed.success) {
            throw new AppError(ErrorNames.EXTERNAL_SERVICE_ERROR, 502, 'Allegro zwróciło nieprawidłowe dane konta.');
        }
        return parsed.data;
    }
}
