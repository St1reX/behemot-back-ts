import { MarketplaceIntegrationRepository } from './repositories/marketplaceIntegrationRepository';

export class MarketplaceIntegrationService {
    static getIntegrations() {
        return MarketplaceIntegrationRepository.findAll();
    }
}
