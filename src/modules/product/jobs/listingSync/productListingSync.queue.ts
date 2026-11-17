import { Queue } from 'bullmq';
import {
    BULLMQ_DEFAULT_JOB_OPTIONS,
    BULLMQ_PREFIX,
    BULLMQ_QUEUE_NAMES,
    registerBullmqQueue,
} from '../../../../config/bullmq';
import { createBullmqQueueRedisConnectionOptions } from '../../../../config/redis';
import { getRequestContext } from '../../../../infrastructure/requestContext/requestContext';
import { INTEGRATION_SYNC_STATUSES } from '../../../../shared/constants/integrationSyncStatuses';
import { emitProductListingSyncStatusChanged } from '../../events/emitProductListingSyncStatusChanged';
import {
    ProductListingSyncJobData,
    ProductListingSyncJobResult,
} from '../../types/product.types';

const productListingSyncQueueName = BULLMQ_QUEUE_NAMES.PRODUCT_LISTING_SYNC;

export const productListingSyncQueue = new Queue<
    ProductListingSyncJobData,
    ProductListingSyncJobResult,
    typeof productListingSyncQueueName
>(productListingSyncQueueName, {
    connection: createBullmqQueueRedisConnectionOptions(),
    prefix: BULLMQ_PREFIX,
    defaultJobOptions: BULLMQ_DEFAULT_JOB_OPTIONS,
});

registerBullmqQueue(productListingSyncQueue);

export async function enqueueProductListingSync(productId: string) {
    const requestedByUserId = getRequestContext()?.userId;
    const job = await productListingSyncQueue.add(productListingSyncQueueName, {
        productId,
        requestedByUserId,
    });

    if (requestedByUserId) {
        emitProductListingSyncStatusChanged(requestedByUserId, {
            jobId: job.id!,
            productId,
            status: INTEGRATION_SYNC_STATUSES.PENDING,
            error: null,
        });
    }

    return job;
}
