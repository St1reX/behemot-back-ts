import { BolmaRepository } from './repositories/bolmaRepository';
import { env } from '../../config/env';
import { BolmaConfiguration, BolmaStatusResponse } from './types/bolma.types';

export class BolmaService {
    static getConfiguration(): BolmaConfiguration {
        return {
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
        };
    }

    static async getStatus(): Promise<BolmaStatusResponse> {
        try {
            await BolmaRepository.checkDatabaseConnection();

            return { status: 'ok', components: { database: 'ok' } };
        } catch {
            return { status: 'error', components: { database: 'error' } };
        }
    }
}
