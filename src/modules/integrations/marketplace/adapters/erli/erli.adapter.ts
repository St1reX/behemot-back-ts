import { IntegrationEnvironment, MarketplaceIntegrationChannel, MarketplaceIntegrationStatus } from '@prisma/client';
import { AppError, ErrorNames } from '../../../../../errors/errorHandler';
import { encryptSecret } from '../../../../../shared/utils/secretEncryption';
import { MarketplaceAccountData, MarketplaceAdapter, MarketplaceConnectionContext, PreparedMarketplaceConfiguration } from '../../types/marketplaceAdapter.types';
import { ErliConfigurationSchema } from './erli.schema';
import { ErliApiClient } from './erli.apiClient';
import { ApiBaseUrlSchema } from '../../schemas/apiBaseUrl.schema';

export class ErliAdapter implements MarketplaceAdapter {
    async prepareConfiguration(input: unknown, integrationId: string): Promise<PreparedMarketplaceConfiguration> {
        const { baseUrl, token } = ErliConfigurationSchema.parse(input);
        const account = await this.checkConnection({ apiKey: token, baseUrl, environment: IntegrationEnvironment.PRODUCTION });

        return {
            ...account,
            baseUrl,
            channel: MarketplaceIntegrationChannel.ERLI,
            encryptedApiKey: encryptSecret(token, `marketplace:${integrationId}:encryptedApiKey`),
            status: MarketplaceIntegrationStatus.CONNECTED,
            lastConnectionCheckAt: new Date(),
        };
    }

    async checkConnection(context: MarketplaceConnectionContext): Promise<MarketplaceAccountData> {
        if (!context.apiKey) {
            throw new AppError(ErrorNames.VALIDATION_ERROR, 422, 'Integracja nie ma zapisanego tokenu API ERLI.');
        }
        if (context.environment !== IntegrationEnvironment.PRODUCTION) {
            throw new AppError(ErrorNames.BAD_REQUEST, 400, 'Środowisko testowe ERLI nie jest jeszcze obsługiwane.');
        }
        const parsedUrl = ApiBaseUrlSchema.safeParse(context.baseUrl);
        if (!parsedUrl.success) {
            throw new AppError(ErrorNames.VALIDATION_ERROR, 422, 'Integracja nie ma poprawnego adresu API ERLI.');
        }
        const shop = await ErliApiClient.getShop(parsedUrl.data, context.apiKey);

        return {
            name: shop.name,
            externalAccountId: String(shop.id),
            externalUsername: shop.name,
            settings: { shopActive: shop.active, scopes: shop.scopes, markets: shop.markets },
        };
    }
}
