import { Prisma } from '@prisma/client';
import { prisma } from '../../../../config/database';
import { PreparedMarketplaceConfiguration } from '../types/marketplaceAdapter.types';

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

export class MarketplaceIntegrationRepository {
    // Internal use only. Never return this projection from a controller or put it in audit logs.
    static findForConnectionCheck(id: string) {
        return prisma.marketplaceIntegration.findFirst({
            where: { id, deletedAt: null },
            select: { ...integrationSelect, encryptedApiKey: true },
        });
    }

    static updateConnectionCheck(id: string, data: Pick<Prisma.MarketplaceIntegrationUpdateInput,
        'name' | 'externalAccountId' | 'externalUsername' | 'settings' | 'status' | 'lastConnectionCheckAt' | 'lastErrorAt' | 'lastErrorMessage'>) {
        return prisma.marketplaceIntegration.update({
            where: { id, deletedAt: null },
            data,
            select: integrationSelect,
        });
    }

    static findById(id: string) {
        return prisma.marketplaceIntegration.findFirst({
            where: { id, deletedAt: null },
            select: integrationSelect,
        });
    }

    static softDelete(id: string) {
        return prisma.$transaction(async (tx) => {
            const deletedAt = new Date();
            // Lock the account before archiving dependent records, serializing concurrent deletes.
            await tx.marketplaceIntegration.update({
                where: { id, deletedAt: null },
                data: {
                    deletedAt,
                    isEnabled: false,
                    encryptedAccessToken: null,
                    encryptedRefreshToken: null,
                    encryptedApiKey: null,
                    encryptedPassword: null,
                    accessTokenExpiresAt: null,
                },
                select: { id: true },
            });
            await tx.productExternalListingFitment.updateMany({
                where: { externalListing: { integrationId: id }, deletedAt: null },
                data: { deletedAt },
            });
            await tx.productExternalListing.updateMany({
                where: { integrationId: id, deletedAt: null },
                data: { deletedAt },
            });
        });
    }

    static create(id: string, configuration: PreparedMarketplaceConfiguration) {
        return prisma.marketplaceIntegration.create({
            data: { id, ...configuration },
            select: integrationSelect,
        });
    }

    static findAll() {
        return prisma.marketplaceIntegration.findMany({
            where: { deletedAt: null },
            select: integrationSelect,
            orderBy: [{ channel: 'asc' }, { name: 'asc' }, { id: 'asc' }],
        });
    }
}
