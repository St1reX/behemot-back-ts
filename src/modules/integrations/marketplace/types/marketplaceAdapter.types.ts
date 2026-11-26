import type { MarketplaceIntegrationChannel } from '@prisma/client';

export interface PreparedMarketplaceConfiguration {
    name: string;
    channel: MarketplaceIntegrationChannel;
    encryptedApiKey: string;
}

export interface MarketplaceAdapter {
    prepareConfiguration(input: unknown, integrationId: string): PreparedMarketplaceConfiguration;
}
