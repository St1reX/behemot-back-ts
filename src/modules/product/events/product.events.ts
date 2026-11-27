import type { IntegrationSyncStatus } from '@prisma/client';

export const PRODUCT_SOCKET_EVENTS = {
    LISTING_SYNC_STATUS_CHANGED: 'product-listing-sync-status-changed',
} as const;

export interface ProductListingSyncStatusChangedEvent {
    jobId: string;
    productId: string;
    status: IntegrationSyncStatus;
    error: string | null;
}

export type ProductServerToClientEvents = {
    [PRODUCT_SOCKET_EVENTS.LISTING_SYNC_STATUS_CHANGED]: (
        event: ProductListingSyncStatusChangedEvent,
    ) => void;
};
