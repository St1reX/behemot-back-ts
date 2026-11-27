import { AppError, ErrorNames } from '../../../../errors/errorHandler';
import { encryptSecret } from '../../../../shared/utils/secretEncryption';
import { MarketplaceAccountData, MarketplaceAdapter, MarketplaceConnectionContext, PreparedMarketplaceConfiguration } from '../../types/marketplaceAdapter.types';
import { AllegroApiClient } from './allegro.apiClient';
import { AllegroOAuthApiClient } from './oauth/allegroOAuth.apiClient';
import { AllegroConfigurationSchema } from './allegro.schema';
import { AllegroOAuthService } from './oauth/allegroOAuth.service';

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
        const user = await AllegroOAuthService.withAccessToken(integrationId, (baseUrl, accessToken) =>
            AllegroApiClient.getUser(baseUrl, accessToken),
        );
        return {
            name: user.login,
            externalAccountId: user.id,
            externalUsername: user.login,
            settings: {},
        };
    }

    private ensureIntegrationId(integrationId?: string) {
        if (!integrationId) {
            throw new AppError(ErrorNames.VALIDATION_ERROR, 422, 'Brak identyfikatora integracji Allegro.');
        }
        return integrationId;
    }
}
