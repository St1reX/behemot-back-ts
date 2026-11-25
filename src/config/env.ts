import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
    UPLOADS_ROOT_PATH: z.string().min(1).default('uploads'),
    PUBLIC_UPLOADS_URL: z.string().url().optional(),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().min(1),
    BULLMQ_REDIS_URL: z.string().min(1),
    SESSION_SECRET: z.string().min(1),
    COOKIE_DOMAIN: z.string().min(1),
    PROD_API_URL: z.string().url(),
    PROD_API_PORT: z.coerce.number().int().positive().max(65535),
    DEV_API_URL: z.string().url(),
    DEV_API_PORT: z.coerce.number().int().positive().max(65535),
    PROD_FRONTEND_URL: z.string().url().optional(),
    DEV_FRONTEND_URL: z.string().url().optional(),
    SMTP_HOST: z.string().min(1),
    SMTP_PORT: z.coerce.number().int().positive().max(65535),
    SMTP_LOGIN: z.string().min(1),
    SMTP_PASSWORD: z.string().min(1),
    BOLMA_PRODUCTS_CATALOG_MYSQL_HOST: z.string().min(1),
    BOLMA_PRODUCTS_CATALOG_MYSQL_PORT: z.coerce.number().int().positive().max(65535).default(3306),
    BOLMA_PRODUCTS_CATALOG_MYSQL_DATABASE: z.string().min(1),
    BOLMA_PRODUCTS_CATALOG_MYSQL_USERNAME: z.string().min(1),
    BOLMA_PRODUCTS_CATALOG_MYSQL_PASSWORD: z.string().min(1),
    BOLMA_PRODUCTS_CATALOG_MYSQL_CHARSET: z.string().min(1).default('utf8mb4'),
    BOLMA_PRODUCTS_CATALOG_MYSQL_CONNECT_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
    BOLMA_PRODUCTS_CATALOG_MYSQL_SSL: z.enum(['true', 'false']).default('false').transform(
        (value) => value === 'true',
    ),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
    throw new Error(`Invalid environment variables: ${parsedEnv.error.message}`);
}

export const env = parsedEnv.data;

export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';

export const apiUrl = isProduction ? env.PROD_API_URL : env.DEV_API_URL;
export const apiPort = isProduction ? env.PROD_API_PORT : env.DEV_API_PORT;
const configuredFrontendUrl = isProduction ? env.PROD_FRONTEND_URL : env.DEV_FRONTEND_URL;

if (!configuredFrontendUrl) {
    const variableName = isProduction ? 'PROD_FRONTEND_URL' : 'DEV_FRONTEND_URL';
    throw new Error(`Invalid environment variables: ${variableName} is required`);
}

export const frontendUrl = configuredFrontendUrl;
