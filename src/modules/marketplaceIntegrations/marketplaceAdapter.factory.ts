import { MarketplaceIntegrationChannel } from '@prisma/client';
import { AppError, ErrorNames } from '../../errors/errorHandler';
import { ErliAdapter } from './adapters/erli/erli.adapter';
import { PrestashopAdapter } from './adapters/prestashop/prestashop.adapter';
import { EmagAdapter } from './adapters/emag/emag.adapter';
import { MarketplaceAdapter } from './types/marketplaceAdapter.types';
import { AllegroAdapter } from './adapters/allegro/allegro.adapter';

export function createMarketplaceAdapter(channel: MarketplaceIntegrationChannel): MarketplaceAdapter {
    switch (channel) {
        case MarketplaceIntegrationChannel.ALLEGRO:
            return new AllegroAdapter();
        case MarketplaceIntegrationChannel.ERLI:
            return new ErliAdapter();
        case MarketplaceIntegrationChannel.PRESTASHOP:
            return new PrestashopAdapter();
        case MarketplaceIntegrationChannel.EMAG:
            return new EmagAdapter();
        default:
            throw new AppError(ErrorNames.BAD_REQUEST, 400, 'Ten kanał integracji nie jest jeszcze obsługiwany.');
    }
}
