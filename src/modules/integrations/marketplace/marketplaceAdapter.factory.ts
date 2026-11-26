import { MarketplaceIntegrationChannel } from '@prisma/client';
import { AppError, ErrorNames } from '../../../errors/errorHandler';
import { ErliAdapter } from './adapters/erli/erli.adapter';
import { MarketplaceAdapter } from './types/marketplaceAdapter.types';

export function createMarketplaceAdapter(channel: MarketplaceIntegrationChannel): MarketplaceAdapter {
    switch (channel) {
        case MarketplaceIntegrationChannel.ERLI:
            return new ErliAdapter();
        default:
            throw new AppError(ErrorNames.BAD_REQUEST, 400, 'Ten kanał integracji nie jest jeszcze obsługiwany.');
    }
}
