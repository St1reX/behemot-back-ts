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
        const { baseUrl, apiKey } = this.ensureConnectionConfiguration(context);
        const shop = await PrestashopApiClient.getFirstShop(baseUrl, apiKey);
        return {
            name: shop.name,
            externalAccountId: shop.id,
            externalUsername: shop.name,
            settings: { shopActive: shop.active, shopGroupId: shop.id_shop_group },
        };
    }

    private ensureConnectionConfiguration(context: MarketplaceConnectionContext) {
        if (!context.apiKey) {
            throw new AppError(ErrorNames.VALIDATION_ERROR, 422, 'Integracja nie ma zapisanego klucza API PrestaShop.');
        }
        const parsedUrl = PrestashopBaseUrlSchema.safeParse(context.baseUrl);
        if (!parsedUrl.success) {
            throw new AppError(ErrorNames.VALIDATION_ERROR, 422, 'Integracja nie ma poprawnego adresu HTTPS sklepu PrestaShop.');
        }
        return { baseUrl: parsedUrl.data, apiKey: context.apiKey };
    }
}
