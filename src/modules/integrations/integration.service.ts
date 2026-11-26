import { env } from '../../config/env';
import { IntegrationRepository } from './repositories/integrationRepository';

export class IntegrationService {
    static async getIntegrations() {
        const marketplaces = await IntegrationRepository.findMarketplaces();

        return {
            bolma: {
                id: 'bolma',
                name: 'Baza Bolmy',
                engine: 'MySQL',
                isConfigured: Boolean(
                    env.BOLMA_PRODUCTS_CATALOG_MYSQL_HOST &&
                    env.BOLMA_PRODUCTS_CATALOG_MYSQL_DATABASE &&
                    env.BOLMA_PRODUCTS_CATALOG_MYSQL_USERNAME &&
                    env.BOLMA_PRODUCTS_CATALOG_MYSQL_PASSWORD,
                ),
                sslEnabled: env.BOLMA_PRODUCTS_CATALOG_MYSQL_SSL,
            },
            marketplaces,
        };
    }
}
