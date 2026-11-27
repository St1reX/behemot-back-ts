import { env } from '../../../config/env';
import { bolmaDatabasePool } from '../config/database';

export class BolmaRepository {
    static async checkDatabaseConnection(): Promise<void> {
        const connection = await bolmaDatabasePool.getConnection();

        try {
            await connection.query({
                sql: 'SELECT 1',
                timeout: env.BOLMA_PRODUCTS_CATALOG_MYSQL_CONNECT_TIMEOUT_MS,
            });
            connection.release();
        } catch (error) {
            connection.destroy();
            throw error;
        }
    }
}
