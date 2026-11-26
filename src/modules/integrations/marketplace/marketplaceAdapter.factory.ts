import { MarketplaceIntegrationChannel } from '@prisma/client';
import { AppError, ErrorNames } from '../../../errors/errorHandler';
import { ErliAdapter } from './adapters/erli/erli.adapter';
import { MarketplaceAdapter } from './types/marketplaceAdapter.types';

export function createMarketplaceAdapter(channel: MarketplaceIntegrationChannel): MarketplaceAdapter {
    switch (channel) {
        case 'ERLI':
            return new ErliAdapter();
        default:
            throw new AppError(ErrorNames.BAD_REQUEST, 400, 'Konfiguracja tego kanału nie jest jeszcze obsługiwana.');
    }
}
