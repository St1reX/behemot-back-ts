import type { IntegrationEnvironment, MarketplaceIntegrationChannel } from '@prisma/client';

export interface AllegroTokenIntegration {
    channel: MarketplaceIntegrationChannel;
    environment: IntegrationEnvironment;
    baseUrl: string | null;
    encryptedApiKey: string | null;
    encryptedPassword: string | null;
    encryptedAccessToken: string | null;
    encryptedRefreshToken: string | null;
    accessTokenExpiresAt: Date | null;
}
