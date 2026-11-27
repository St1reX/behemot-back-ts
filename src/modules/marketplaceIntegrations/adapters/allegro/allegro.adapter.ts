import { AppError, ErrorNames } from '../../../../errors/errorHandler';
import { decryptSecret, encryptSecret } from '../../../../shared/utils/secretEncryption';
import { MarketplaceAccountData, MarketplaceAdapter, MarketplaceConnectionContext, PreparedMarketplaceConfiguration } from '../../types/marketplaceAdapter.types';
import { AllegroApiClient } from './allegro.apiClient';
import { AllegroOAuthApiClient } from './oauth/allegroOAuth.apiClient';
import { AllegroConfigurationSchema } from './allegro.schema';
import { ApiBaseUrlSchema } from '../../schemas/apiBaseUrl.schema';
import { MarketplaceIntegrationRepository } from '../../repositories/marketplaceIntegrationRepository';

type AllegroTokenIntegration = NonNullable<Awaited<ReturnType<typeof MarketplaceIntegrationRepository.findForTokenRefresh>>>;

export class AllegroAdapter implements MarketplaceAdapter {
    async prepareConfiguration(input: unknown, integrationId: string): Promise<PreparedMarketplaceConfiguration> {
        const { baseUrl, code, clientId, clientSecret, redirectUri } = AllegroConfigurationSchema.parse(input);
        const issuedAt = Date.now();
        const tokens = await AllegroOAuthApiClient.exchangeCode(code, clientId, clientSecret, redirectUri);
        const user = await AllegroApiClient.getUser(baseUrl, tokens.access_token);
        return {
            name: user.login,
            externalAccountId: user.id,
            externalUsername: user.login,
            settings: {},
            baseUrl,
            channel: 'ALLEGRO',
            encryptedApiKey: encryptSecret(clientId, `marketplace:${integrationId}:encryptedApiKey`),
            encryptedPassword: encryptSecret(clientSecret, `marketplace:${integrationId}:encryptedPassword`),
            encryptedAccessToken: encryptSecret(tokens.access_token, `marketplace:${integrationId}:encryptedAccessToken`),
            encryptedRefreshToken: encryptSecret(tokens.refresh_token, `marketplace:${integrationId}:encryptedRefreshToken`),
            accessTokenExpiresAt: new Date(issuedAt + tokens.expires_in * 1000),
            status: 'CONNECTED', lastConnectionCheckAt: new Date(),
        };
    }

    async checkConnection(context: MarketplaceConnectionContext): Promise<MarketplaceAccountData> {
        const integrationId = this.ensureIntegrationId(context.integrationId);
        const user = await this.withAccessToken(integrationId, (baseUrl, accessToken) =>
            AllegroApiClient.getUser(baseUrl, accessToken),
        );
        return {
            name: user.login,
            externalAccountId: user.id,
            externalUsername: user.login,
            settings: {},
        };
    }

    private async withAccessToken<T>(integrationId: string, operation: (baseUrl: string, accessToken: string) => Promise<T>): Promise<T> {
        let authorization = await this.getAccessToken(integrationId);
        try {
            return await operation(authorization.baseUrl, authorization.accessToken);
        } catch (error) {
            if (!(error instanceof AppError) || error.name !== ErrorNames.AUTHORIZATION_ERROR) throw error;
        }

        // Retry only a provider 401, once. Token-endpoint failures are not retried here.
        authorization = await this.getAccessToken(integrationId, authorization.accessToken);
        return operation(authorization.baseUrl, authorization.accessToken);
    }

    private getAccessToken(integrationId: string, rejectedToken?: string) {
        return MarketplaceIntegrationRepository.withTokenRefreshLock(integrationId, async (tx) => {
            // Always re-read after acquiring the lock: another process may have refreshed already.
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

    private ensureIntegrationId(integrationId?: string) {
        if (!integrationId) {
            throw new AppError(ErrorNames.VALIDATION_ERROR, 422, 'Brak identyfikatora integracji Allegro.');
        }
        return integrationId;
    }

    private ensureConnectionConfiguration(integration: AllegroTokenIntegration | null) {
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

    private ensureRefreshCredentials(integration: AllegroTokenIntegration) {
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
