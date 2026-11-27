import { IntegrationEnvironment, MarketplaceIntegrationChannel, MarketplaceIntegrationStatus } from '@prisma/client';
import { AppError, ErrorNames } from '../../../../errors/errorHandler';
import { encryptSecret } from '../../../../shared/utils/secretEncryption';
import { MarketplaceAccountData, MarketplaceAdapter, MarketplaceConnectionContext, PreparedMarketplaceConfiguration } from '../../types/marketplaceAdapter.types';
import { EmagApiClient } from './emag.apiClient';
import { EmagConfigurationSchema } from './emag.schema';

export class EmagAdapter implements MarketplaceAdapter {
    async prepareConfiguration(input: unknown, integrationId: string): Promise<PreparedMarketplaceConfiguration> {
        const configuration = EmagConfigurationSchema.parse(input);
        const account = await this.checkConnection({ ...configuration, environment: IntegrationEnvironment.PRODUCTION });
        return {
            ...account,
            channel: MarketplaceIntegrationChannel.EMAG,
            baseUrl: configuration.baseUrl,
            market: configuration.market,
            encryptedPassword: encryptSecret(configuration.password, `marketplace:${integrationId}:encryptedPassword`),
            status: MarketplaceIntegrationStatus.CONNECTED,
            lastConnectionCheckAt: new Date(),
        };
    }

    async checkConnection(context: MarketplaceConnectionContext): Promise<MarketplaceAccountData> {
        const { baseUrl, market, username, password } = this.ensureConnectionConfiguration(context);
        await EmagApiClient.checkConnection(baseUrl, username, password);

        // The public API has no seller-profile endpoint. Do not fabricate a remote seller ID.
        return { name: `eMAG ${market} — ${username}`, externalAccountId: null, externalUsername: username, settings: {} };
    }

    private ensureConnectionConfiguration(context: MarketplaceConnectionContext) {
        if (context.environment !== IntegrationEnvironment.PRODUCTION) {
            throw new AppError(ErrorNames.BAD_REQUEST, 400, 'Środowisko testowe eMAG nie jest jeszcze obsługiwane.');
        }
        const parsed = EmagConfigurationSchema.safeParse({
            baseUrl: context.baseUrl,
            market: context.market,
            username: context.username,
            password: context.password,
        });
        if (!parsed.success) {
            throw new AppError(ErrorNames.VALIDATION_ERROR, 422, 'Integracja eMAG nie ma poprawnego adresu API, rynku, e-maila lub hasła.');
        }
        return parsed.data;
    }
}
