import type { MarketplaceIntegrationChannel, IntegrationSyncStatus, ProductSide, Prisma } from '@prisma/client';

export interface ProductResponse {
    id: string;
    isLegacy: boolean;
    contentVersion: number;
    title: string | null;
    summary: string | null;
    description: string | null;
    listingContentError: string | null;
    imagesUrls: string[];
    descriptionImagesUrls: string[];
    price: Prisma.Decimal | null;
    quantity: number | null;
    customName: string | null;
    customSummary: string | null;
    customDescription: string | null;
    internalNote: string | null;
    side: ProductSide | null;
    weight: Prisma.Decimal | null;
    length: Prisma.Decimal | null;
    width: Prisma.Decimal | null;
    height: Prisma.Decimal | null;
    sku: string;
    ean: string | null;
    oem: string[];
    warehouseLocation: string | null;
    warehouse: {
        id: string;
        name: string;
    } | null;
    listingTemplate: {
        id: string;
        name: string;
    } | null;
    department: {
        id: string;
        name: string;
        shortcut: string;
    } | null;
    producer: {
        id: string;
        name: string;
    } | null;
    primaryFitment: ProductResponseFitment | null;
    productFitments: ProductResponseFitment[];
    externalListings: {
        id: string;
        integrationId: string;
        integration: { id: string; name: string };
        lastSyncedContentVersion: number | null;
        channel: MarketplaceIntegrationChannel;
        externalId: string | null;
        syncStatus: IntegrationSyncStatus;
        lastSyncedAt: Date | null;
        lastError: string | null;
    }[];
    createdAt: Date;
    updatedAt: Date;
}

export interface ProductResponseFitment {
    id: string;
    isPrimary: boolean;
    carBrand: { id: string; name: string } | null;
    carModel: { id: string; name: string; carBrand: { id: string; name: string } } | null;
    carGeneration: {
        id: string;
        startProduction: number;
        endProduction: number | null;
        carModel: {
            id: string;
            name: string;
            carBrand: {
                id: string;
                name: string;
            };
        };
    } | null;
}

export interface DeleteProductResponse {
    message: string;
}

export interface ProductListingSyncJobData {
    productId: string;
    requestedByUserId?: string;
}

export interface ProductListingSyncJobResult {
    productId: string;
    activeListingsCount: number;
    skipped: true;
}
