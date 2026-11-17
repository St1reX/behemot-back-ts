import Redis from 'ioredis';
import { env } from './env';

const redisClient = new Redis(env.REDIS_URL);

redisClient.on('error', (err) => {
    console.error('Redis error:', err);
});

const bullmqRedisUrl = env.BULLMQ_REDIS_URL ?? env.REDIS_URL;

function createBullmqRedisConnectionOptions(maxRetriesPerRequest: number | null) {
    const parsedRedisUrl = new URL(bullmqRedisUrl);

    return {
        host: parsedRedisUrl.hostname,
        port: Number(parsedRedisUrl.port || 6379),
        username: parsedRedisUrl.username || undefined,
        password: parsedRedisUrl.password || undefined,
        db: Number(parsedRedisUrl.pathname.slice(1) || 0),
        tls: parsedRedisUrl.protocol === 'rediss:' ? {} : undefined,
        maxRetriesPerRequest,
    };
}

export function createBullmqQueueRedisConnectionOptions() {
    return createBullmqRedisConnectionOptions(1);
}

export function createBullmqWorkerRedisConnectionOptions() {
    return createBullmqRedisConnectionOptions(null);
}

export { redisClient };
