import { Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';

// Explicit projection: credentials and free-form settings must never reach the panel.
const integrationSelect = {
    id: true,
    name: true,
    channel: true,
    externalAccountId: true,
    externalUsername: true,
    environment: true,
    market: true,
    isEnabled: true,
    status: true,
    accessTokenExpiresAt: true,
    lastConnectionCheckAt: true,
    lastSuccessfulSyncAt: true,
    lastErrorAt: true,
    createdAt: true,
    updatedAt: true,
} satisfies Prisma.MarketplaceIntegrationSelect;

export class IntegrationRepository {
    static findMarketplaces() {
        return prisma.marketplaceIntegration.findMany({
            where: { deletedAt: null },
            select: integrationSelect,
            orderBy: [{ channel: 'asc' }, { name: 'asc' }, { id: 'asc' }],
        });
    }
}
