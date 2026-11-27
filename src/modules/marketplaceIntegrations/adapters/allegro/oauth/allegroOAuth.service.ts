import { createHash, randomBytes } from 'node:crypto';
import { apiPort, apiUrl, isDevelopment } from '../../../../../config/env';
import { redisClient } from '../../../../../config/redis';
import { AppError, ErrorNames } from '../../../../../errors/errorHandler';
import { decryptSecret, encryptSecret } from '../../../../../shared/utils/secretEncryption';
import { MarketplaceIntegrationRepository } from '../../../repositories/marketplaceIntegrationRepository';
import { AllegroOAuthApiClient } from './allegroOAuth.apiClient';
import { AllegroAuthorizationSchema, AllegroOAuthStateSchema } from '../allegro.schema';
import { ApiBaseUrlSchema } from '../../../schemas/apiBaseUrl.schema';
import type { AllegroTokenIntegration } from './allegroOAuth.types';

function sessionHash(sessionId: string) {
    return createHash('sha256').update(sessionId).digest('hex');
}

export class AllegroOAuthService {
    static getCallbackUrl() {
        const backendUrl = new URL(apiUrl);
        if (isDevelopment && !backendUrl.port) backendUrl.port = String(apiPort);
        backendUrl.pathname = `${backendUrl.pathname.replace(/\/+$/, '')}/marketplace-integrations/allegro/callback`;
        backendUrl.search = '';
        backendUrl.hash = '';
        return backendUrl.toString();
    }

    static async start(input: unknown, sessionId: string, userId: string) {
        const configuration = AllegroAuthorizationSchema.parse(input);
        if (configuration.integrationId) {
            const integration = await MarketplaceIntegrationRepository.findById(configuration.integrationId);
            if (!integration || integration.channel !== 'ALLEGRO') {
                throw new AppError(ErrorNames.RESOURCE_NOT_FOUND, 404, 'Nie znaleziono integracji Allegro.');
            }
        }
        const state = randomBytes(32).toString('hex');
        const redirectUri = this.getCallbackUrl();
        const key = `integrations:allegro:oauth:${state}`;
        const payload = JSON.stringify({ ...configuration, redirectUri, sessionHash: sessionHash(sessionId), userId });
        await redisClient.set(key, encryptSecret(payload, key), 'EX', 600);

        return { authorizationUrl: AllegroOAuthApiClient.getAuthorizationUrl(configuration.clientId, state, redirectUri) };
    }

    static async consumeState(state: string, sessionId: string, userId: string) {
        const key = `integrations:allegro:oauth:${state}`;
        const encrypted = await redisClient.get(key);
        if (!encrypted) {
            throw new AppError(ErrorNames.VALIDATION_ERROR, 422, 'Autoryzacja Allegro wygasła lub została już wykorzystana. Rozpocznij ją ponownie.');
        }
        const payload = AllegroOAuthStateSchema.parse(JSON.parse(decryptSecret(encrypted, key)));
        if (payload.sessionHash !== sessionHash(sessionId) || payload.userId !== userId) {
            throw new AppError(ErrorNames.FORBIDDEN, 403, 'Autoryzacja Allegro nie należy do bieżącej sesji.');
        }
        if (await redisClient.getdel(key) !== encrypted) {
            throw new AppError(ErrorNames.CONFLICT, 409, 'Ta autoryzacja Allegro została już wykorzystana.');
        }
        return payload;
    }

    static async withAccessToken<T>(integrationId: string, operation: (baseUrl: string, accessToken: string) => Promise<T>): Promise<T> {
        let authorization = await this.getAccessToken(integrationId);
        try {
            return await operation(authorization.baseUrl, authorization.accessToken);
        } catch (error) {
            if (!(error instanceof AppError) || error.name !== ErrorNames.AUTHORIZATION_ERROR) throw error;
        }
        authorization = await this.getAccessToken(integrationId, authorization.accessToken);
        return operation(authorization.baseUrl, authorization.accessToken);
    }

    private static getAccessToken(integrationId: string, rejectedToken?: string) {
        return MarketplaceIntegrationRepository.withTokenRefreshLock(integrationId, async (tx) => {
            const integration = this.ensureConnectionConfiguration(
                await MarketplaceIntegrationRepository.findForTokenRefresh(integrationId, tx),
            );
            const accessToken = integration.encryptedAccessToken
                ? decryptSecret(integration.encryptedAccessToken, `marketplace:${integrationId}:encryptedAccessToken`)
                : undefined;
            const expiresAt = integration.accessTokenExpiresAt?.getTime() ?? 0;
            if (accessToken && expiresAt > Date.now() + 60_000 && accessToken !== rejectedToken) {
                return { baseUrl: integration.baseUrl, accessToken };
            }
            const credentials = this.ensureRefreshCredentials(integration);
            const clientId = decryptSecret(credentials.encryptedApiKey, `marketplace:${integrationId}:encryptedApiKey`);
            const clientSecret = decryptSecret(credentials.encryptedPassword, `marketplace:${integrationId}:encryptedPassword`);
            const refreshToken = decryptSecret(credentials.encryptedRefreshToken, `marketplace:${integrationId}:encryptedRefreshToken`);
            const issuedAt = Date.now();
            const tokens = await AllegroOAuthApiClient.refreshTokens(refreshToken, clientId, clientSecret);
            await MarketplaceIntegrationRepository.updateTokens(integrationId, {
                encryptedAccessToken: encryptSecret(tokens.access_token, `marketplace:${integrationId}:encryptedAccessToken`),
                encryptedRefreshToken: encryptSecret(tokens.refresh_token, `marketplace:${integrationId}:encryptedRefreshToken`),
                accessTokenExpiresAt: new Date(issuedAt + tokens.expires_in * 1000),
            }, tx);
            return { baseUrl: integration.baseUrl, accessToken: tokens.access_token };
        });
    }

    private static ensureConnectionConfiguration(integration: AllegroTokenIntegration | null) {
        if (!integration || integration.channel !== 'ALLEGRO') {
            throw new AppError(ErrorNames.RESOURCE_NOT_FOUND, 404, 'Nie znaleziono integracji Allegro.');
        }
        if (integration.environment !== 'PRODUCTION') {
            throw new AppError(ErrorNames.BAD_REQUEST, 400, 'Środowisko testowe Allegro nie jest jeszcze obsługiwane.');
        }
        const baseUrl = ApiBaseUrlSchema.safeParse(integration.baseUrl);
        if (!baseUrl.success) {
            throw new AppError(ErrorNames.VALIDATION_ERROR, 422, 'Integracja Allegro nie ma poprawnego adresu API.');
        }
        return { ...integration, baseUrl: baseUrl.data };
    }

    private static ensureRefreshCredentials(integration: AllegroTokenIntegration) {
        if (!integration.encryptedApiKey || !integration.encryptedPassword || !integration.encryptedRefreshToken) {
            throw new AppError(ErrorNames.VALIDATION_ERROR, 422, 'Integracja Allegro nie ma danych potrzebnych do odświeżenia tokenu. Połącz konto ponownie.');
        }
        return {
            encryptedApiKey: integration.encryptedApiKey,
            encryptedPassword: integration.encryptedPassword,
            encryptedRefreshToken: integration.encryptedRefreshToken,
        };
    }
}
