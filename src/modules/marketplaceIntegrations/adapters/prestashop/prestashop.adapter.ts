import { IntegrationEnvironment, MarketplaceIntegrationChannel, MarketplaceIntegrationStatus } from '@prisma/client';
import { AppError, ErrorNames } from '../../../../errors/errorHandler';
import { encryptSecret } from '../../../../shared/utils/secretEncryption';
import { MarketplaceAccountData, MarketplaceAdapter, MarketplaceConnectionContext, PreparedMarketplaceConfiguration } from '../../types/marketplaceAdapter.types';
import { PrestashopApiClient } from './prestashop.apiClient';
import { PrestashopBaseUrlSchema, PrestashopConfigurationSchema } from './prestashop.schema';

export class PrestashopAdapter implements MarketplaceAdapter {
    async prepareConfiguration(input: unknown, integrationId: string): Promise<PreparedMarketplaceConfiguration> {
        const { baseUrl, apiKey } = PrestashopConfigurationSchema.parse(input);
        const account = await this.checkConnection({ apiKey, baseUrl, environment: IntegrationEnvironment.PRODUCTION });
        return {
            ...account,
            baseUrl,
            channel: MarketplaceIntegrationChannel.PRESTASHOP,
            encryptedApiKey: encryptSecret(apiKey, `marketplace:${integrationId}:encryptedApiKey`),
            status: MarketplaceIntegrationStatus.CONNECTED,
            lastConnectionCheckAt: new Date(),
        };
    }

    async checkConnection(context: MarketplaceConnectionContext): Promise<MarketplaceAccountData> {
        if (!context.apiKey) {
            throw new AppError(ErrorNames.VALIDATION_ERROR, 422, 'Integracja nie ma zapisanego klucza API PrestaShop.');
        }
        const parsedUrl = PrestashopBaseUrlSchema.safeParse(context.baseUrl);
        if (!parsedUrl.success) {
            throw new AppError(ErrorNames.VALIDATION_ERROR, 422, 'Integracja nie ma poprawnego adresu HTTPS sklepu PrestaShop.');
        }
        const shop = await PrestashopApiClient.getFirstShop(parsedUrl.data, context.apiKey);
        return {
            name: shop.name,
            externalAccountId: shop.id,
            externalUsername: shop.name,
            settings: { shopActive: shop.active, shopGroupId: shop.id_shop_group },
        };
    }
}
