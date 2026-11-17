import { Worker } from 'bullmq';
import { BULLMQ_PREFIX, BULLMQ_QUEUE_NAMES } from '../../../../config/bullmq';
import { createBullmqWorkerRedisConnectionOptions } from '../../../../config/redis';
import { processProductListingSync } from './productListingSync.processor';
import {
    ProductListingSyncJobData,
    ProductListingSyncJobResult,
} from '../../types/product.types';

const productListingSyncQueueName = BULLMQ_QUEUE_NAMES.PRODUCT_LISTING_SYNC;

export function createProductListingSyncWorker() {
    const worker = new Worker<ProductListingSyncJobData, ProductListingSyncJobResult>(
        productListingSyncQueueName,
        processProductListingSync,
        {
            connection: createBullmqWorkerRedisConnectionOptions(),
            prefix: BULLMQ_PREFIX,
            concurrency: 1,
        },
    );

    return {
        worker,
    };
}
