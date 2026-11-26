import { IntegrationEnvironment, MarketplaceIntegrationChannel, MarketplaceIntegrationStatus } from '@prisma/client';
import { AppError, ErrorNames } from '../../../../../errors/errorHandler';
import { encryptSecret } from '../../../../../shared/utils/secretEncryption';
import { MarketplaceAccountData, MarketplaceAdapter, MarketplaceConnectionContext, PreparedMarketplaceConfiguration } from '../../types/marketplaceAdapter.types';
import { EmagApiClient } from './emag.apiClient';
import { EmagConfigurationSchema, EmagMarketSchema } from './emag.schema';

export class EmagAdapter implements MarketplaceAdapter {
    readonly markets = EmagMarketSchema.options;

    async prepareConfiguration(input: unknown, integrationId: string, market?: string): Promise<PreparedMarketplaceConfiguration> {
        const configuration = EmagConfigurationSchema.parse(input);
        const selectedMarket = EmagMarketSchema.parse(market);
        const account = await this.checkConnection({ ...configuration, market: selectedMarket, environment: IntegrationEnvironment.PRODUCTION });
        return {
            ...account,
            channel: MarketplaceIntegrationChannel.EMAG,
            market: selectedMarket,
            encryptedPassword: encryptSecret(configuration.password, `marketplace:${integrationId}:encryptedPassword`),
            status: MarketplaceIntegrationStatus.CONNECTED,
            lastConnectionCheckAt: new Date(),
        };
    }

    async checkConnection(context: MarketplaceConnectionContext): Promise<MarketplaceAccountData> {
        if (context.environment !== IntegrationEnvironment.PRODUCTION) {
            throw new AppError(ErrorNames.BAD_REQUEST, 400, 'Środowisko testowe eMAG nie jest jeszcze obsługiwane.');
        }
        const parsed = EmagConfigurationSchema.safeParse({ username: context.username, password: context.password });
        if (!parsed.success) {
            throw new AppError(ErrorNames.VALIDATION_ERROR, 422, 'Integracja eMAG nie ma poprawnego e-maila lub hasła.');
        }
        const { username, password } = parsed.data;
        const market = EmagMarketSchema.safeParse(context.market ?? 'RO');
        if (!market.success) {
            throw new AppError(ErrorNames.VALIDATION_ERROR, 422, 'Integracja eMAG nie ma poprawnego rynku.');
        }
        await EmagApiClient.checkConnection(market.data, username, password);

        // The public API has no seller-profile endpoint. Do not fabricate a remote seller ID.
        return { name: `eMAG ${market.data} — ${username}`, externalAccountId: null, externalUsername: username, settings: {} };
    }
}
