import { getSocketEventEmitter, getUserSocketRoom } from '../../../config/socket';
import {
    PRODUCT_SOCKET_EVENTS,
    ProductListingSyncStatusChangedEvent,
} from './product.events';

export function emitProductListingSyncStatusChanged(
    userId: string,
    event: ProductListingSyncStatusChangedEvent,
) {
    getSocketEventEmitter()
        .to(getUserSocketRoom(userId))
        .emit(PRODUCT_SOCKET_EVENTS.LISTING_SYNC_STATUS_CHANGED, event);
}
