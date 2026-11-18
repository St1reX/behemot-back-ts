import { createPool } from 'mysql2/promise';
import { env } from '../../../../config/env';

export const bolmaDatabasePool = createPool({
    host: env.BOLMA_PRODUCTS_CATALOG_MYSQL_HOST,
    port: env.BOLMA_PRODUCTS_CATALOG_MYSQL_PORT,
    database: env.BOLMA_PRODUCTS_CATALOG_MYSQL_DATABASE,
    user: env.BOLMA_PRODUCTS_CATALOG_MYSQL_USERNAME,
    password: env.BOLMA_PRODUCTS_CATALOG_MYSQL_PASSWORD,
    charset: env.BOLMA_PRODUCTS_CATALOG_MYSQL_CHARSET,
    connectTimeout: env.BOLMA_PRODUCTS_CATALOG_MYSQL_CONNECT_TIMEOUT_MS,
    ssl: env.BOLMA_PRODUCTS_CATALOG_MYSQL_SSL ? { rejectUnauthorized: true } : undefined,
    connectionLimit: 5,
    waitForConnections: false,
});

export function closeBolmaDatabasePool(): Promise<void> {
    return bolmaDatabasePool.end();
}
