import type { IntegrationEnvironment, MarketplaceIntegrationChannel, MarketplaceIntegrationStatus, Prisma } from '@prisma/client';

export interface MarketplaceAccountData {
    name: string;
    externalAccountId: string | null;
    externalUsername: string;
    settings: Prisma.InputJsonObject;
}

export interface MarketplaceConnectionContext {
    apiKey?: string;
    username?: string | null;
    password?: string;
    market?: string | null;
    environment: IntegrationEnvironment;
    baseUrl?: string | null;
}

export interface PreparedMarketplaceConfiguration extends MarketplaceAccountData {
    channel: MarketplaceIntegrationChannel;
    encryptedApiKey?: string;
    encryptedPassword?: string;
    market?: string;
    baseUrl: string;
    status: MarketplaceIntegrationStatus;
    lastConnectionCheckAt: Date;
}

export interface MarketplaceAdapter {
    prepareConfiguration(input: unknown, integrationId: string): Promise<PreparedMarketplaceConfiguration>;
    checkConnection(context: MarketplaceConnectionContext): Promise<MarketplaceAccountData>;
}
