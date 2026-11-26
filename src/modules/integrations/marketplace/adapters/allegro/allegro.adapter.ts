import { AppError, ErrorNames } from '../../../../../errors/errorHandler';
import { encryptSecret } from '../../../../../shared/utils/secretEncryption';
import { MarketplaceAccountData, MarketplaceAdapter, MarketplaceConnectionContext, PreparedMarketplaceConfiguration } from '../../types/marketplaceAdapter.types';
import { AllegroApiClient } from './allegro.apiClient';
import { AllegroConfigurationSchema } from './allegro.schema';
import { ApiBaseUrlSchema } from '../../schemas/apiBaseUrl.schema';

export class AllegroAdapter implements MarketplaceAdapter {
    async prepareConfiguration(input: unknown, integrationId: string): Promise<PreparedMarketplaceConfiguration> {
        const { baseUrl, code, clientId, clientSecret, redirectUri } = AllegroConfigurationSchema.parse(input);
        const issuedAt = Date.now();
        const tokens = await AllegroApiClient.exchangeCode(code, clientId, clientSecret, redirectUri);
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
        if (context.environment !== 'PRODUCTION') {
            throw new AppError(ErrorNames.BAD_REQUEST, 400, 'Środowisko testowe Allegro nie jest jeszcze obsługiwane.');
        }
        const baseUrl = ApiBaseUrlSchema.safeParse(context.baseUrl);
        if (!baseUrl.success || !context.accessToken) {
            throw new AppError(ErrorNames.VALIDATION_ERROR, 422, 'Integracja Allegro nie ma poprawnego adresu API lub tokenu dostępu. Połącz konto ponownie.');
        }
        if (!context.accessTokenExpiresAt || context.accessTokenExpiresAt.getTime() <= Date.now()) {
            throw new AppError(ErrorNames.VALIDATION_ERROR, 422, 'Token dostępu Allegro wygasł. Połącz konto ponownie.');
        }
        const user = await AllegroApiClient.getUser(baseUrl.data, context.accessToken);
        return {
            name: user.login,
            externalAccountId: user.id,
            externalUsername: user.login,
            settings: {},
        };
    }
}
