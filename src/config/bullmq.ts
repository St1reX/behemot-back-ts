import { JobsOptions } from 'bullmq';

interface BullmqQueueResource {
    close(): Promise<void>;
}

const bullmqQueues = new Set<BullmqQueueResource>();

export const BULLMQ_PREFIX = 'behemot';

export const BULLMQ_QUEUE_NAMES = {
    PRODUCT_LISTING_SYNC: 'product-listing-sync',
} as const;

export const BULLMQ_DEFAULT_JOB_OPTIONS: JobsOptions = {
    attempts: 5,
    backoff: {
        type: 'exponential',
        delay: 5_000,
    },
    removeOnComplete: {
        age: 24 * 60 * 60,
        count: 1_000,
    },
    removeOnFail: {
        age: 7 * 24 * 60 * 60,
        count: 5_000,
    },
};

export function registerBullmqQueue(queue: BullmqQueueResource) {
    bullmqQueues.add(queue);
}

export async function closeBullmqQueues() {
    await Promise.all(Array.from(bullmqQueues, (queue) => queue.close()));
    bullmqQueues.clear();
}
