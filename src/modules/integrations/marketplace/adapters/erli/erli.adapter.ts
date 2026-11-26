import { encryptSecret } from '../../../../../shared/utils/secretEncryption';
import { MarketplaceAdapter, PreparedMarketplaceConfiguration } from '../../types/marketplaceAdapter.types';
import { ErliConfigurationSchema } from './erli.schema';

export class ErliAdapter implements MarketplaceAdapter {
    prepareConfiguration(input: unknown, integrationId: string): PreparedMarketplaceConfiguration {
        const { token } = ErliConfigurationSchema.parse(input);

        return {
            name: 'ERLI',
            channel: 'ERLI',
            encryptedApiKey: encryptSecret(token, `marketplace:${integrationId}:encryptedApiKey`),
        };
    }
}
