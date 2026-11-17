import { Worker } from 'bullmq';
import { prisma } from './config/database';
import { appWinston } from './config/logger/appWinston';
import { closeSocketEventEmitter } from './config/socket';
import { createProductListingSyncWorker } from './modules/product/jobs/listingSync/productListingSync.worker';
import { setupGracefulShutdown } from './shared/utils/gracefulShutdown';

const workerResources: Array<{
    worker: Worker;
}> = [createProductListingSyncWorker()];

for (const { worker } of workerResources) {
    worker.on('completed', (job) => {
        appWinston.info(`Job ${job.name} (${job.id}) completed`);
    });

    worker.on('failed', (job, error) => {
        appWinston.error(`Job ${job?.name} (${job?.id}) failed: ${error.message}`);
    });

    worker.on('error', (error) => {
        appWinston.error(`Worker error: ${error.message}`);
    });
}

appWinston.info(`Started ${workerResources.length} BullMQ worker`);

setupGracefulShutdown({
    processName: 'BullMQ worker process',
    tasks: [
        {
            name: 'BullMQ workers',
            close: () => Promise.all(workerResources.map(({ worker }) => worker.close())),
        },
        { name: 'Socket.IO emitter', close: closeSocketEventEmitter },
        { name: 'Prisma connection', close: () => prisma.$disconnect() },
    ],
});
