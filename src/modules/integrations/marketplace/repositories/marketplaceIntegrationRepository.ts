import { IntegrationEnvironment, Prisma } from '@prisma/client';
import { prisma } from '../../../../config/database';
import { PreparedMarketplaceConfiguration } from '../types/marketplaceAdapter.types';
import { AppError, ErrorNames } from '../../../../errors/errorHandler';

// Explicit projection: credentials and free-form settings must never reach the panel.
const integrationSelect = {
    id: true,
    name: true,
    channel: true,
    baseUrl: true,
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
    static findExisting(configuration: PreparedMarketplaceConfiguration) {
        return prisma.marketplaceIntegration.findFirst({
            where: {
                channel: configuration.channel,
                environment: IntegrationEnvironment.PRODUCTION,
                market: configuration.market ?? null,
                baseUrl: configuration.baseUrl,
                deletedAt: null,
                ...(configuration.externalAccountId !== null ? {
                    externalAccountId: configuration.externalAccountId,
                } : {
                    externalUsername: { equals: configuration.externalUsername, mode: 'insensitive' },
                }),
            },
            select: { id: true },
        });
    }

    // Internal use only. Never return this projection from a controller or put it in audit logs.
    static findForConnectionCheck(id: string) {
        return prisma.marketplaceIntegration.findFirst({
            where: { id, deletedAt: null },
            select: { ...integrationSelect, encryptedApiKey: true, encryptedPassword: true },
        });
    }

    // Internal use only; token projections must not reach controllers or audit logs.
    static findForTokenRefresh(id: string, tx: Prisma.TransactionClient) {
        return tx.marketplaceIntegration.findFirst({
            where: { id, deletedAt: null },
            select: {
                channel: true,
                environment: true,
                baseUrl: true,
                encryptedApiKey: true,
                encryptedPassword: true,
                encryptedAccessToken: true,
                encryptedRefreshToken: true,
                accessTokenExpiresAt: true,
            },
        });
    }

    static withTokenRefreshLock<T>(id: string, operation: (tx: Prisma.TransactionClient) => Promise<T>) {
        return prisma.$transaction(async (tx) => {
            // Leave time for the 10-second OAuth request and commit within the transaction limit.
            await tx.$executeRaw`SET LOCAL lock_timeout = '10s'`;
            // The row lock also serializes refreshes with reconnection and deletion.
            const rows = await tx.$queryRaw<{ id: string }[]>`
                SELECT "id" FROM "MarketplaceIntegration"
                WHERE "id" = ${id} AND "deletedAt" IS NULL
                FOR UPDATE
            `;
            if (!rows.length) {
                throw new AppError(ErrorNames.RESOURCE_NOT_FOUND, 404, 'Nie znaleziono integracji.');
            }
            return operation(tx);
        }, { timeout: 25_000 });
    }

    static updateTokens(id: string, tokens: {
        encryptedAccessToken: string;
        encryptedRefreshToken: string;
        accessTokenExpiresAt: Date;
    }, tx: Prisma.TransactionClient) {
        return tx.marketplaceIntegration.update({
            where: { id, deletedAt: null },
            data: tokens,
            select: { id: true },
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

    static updateConfiguration(id: string, configuration: PreparedMarketplaceConfiguration) {
        return prisma.marketplaceIntegration.update({
            where: { id, channel: configuration.channel, deletedAt: null },
            data: { ...configuration, lastErrorAt: null, lastErrorMessage: null },
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
