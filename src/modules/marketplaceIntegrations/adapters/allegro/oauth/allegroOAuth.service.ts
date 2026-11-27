import { createHash, randomBytes } from 'node:crypto';
import { apiPort, apiUrl, isDevelopment } from '../../../../../config/env';
import { redisClient } from '../../../../../config/redis';
import { AppError, ErrorNames } from '../../../../../errors/errorHandler';
import { decryptSecret, encryptSecret } from '../../../../../shared/utils/secretEncryption';
import { MarketplaceIntegrationService } from '../../../marketplaceIntegration.service';
import { MarketplaceIntegrationRepository } from '../../../repositories/marketplaceIntegrationRepository';
import { AllegroOAuthApiClient } from './allegroOAuth.apiClient';
import { AllegroAuthorizationSchema, AllegroOAuthStateSchema } from '../allegro.schema';

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

    static complete(configuration: { baseUrl: string; integrationId?: string; clientId: string; clientSecret: string; redirectUri: string }, code: string) {
        const input = { baseUrl: configuration.baseUrl, clientId: configuration.clientId, clientSecret: configuration.clientSecret, redirectUri: configuration.redirectUri, code };
        return configuration.integrationId
            ? MarketplaceIntegrationService.reconnectIntegration(configuration.integrationId, 'ALLEGRO', input)
            : MarketplaceIntegrationService.createIntegration('ALLEGRO', input);
    }
}
