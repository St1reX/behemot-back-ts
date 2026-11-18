import { Job } from 'bullmq';
import { appWinston } from '../../../../config/logger/appWinston';
import { INTEGRATION_SYNC_STATUSES } from '../../../../shared/constants/integrationSyncStatuses';
import { emitProductListingSyncStatusChanged } from '../../events/emitProductListingSyncStatusChanged';
import { ProductRepository } from '../../repositories/productRepository';
import { ProductListingSyncJobData, ProductListingSyncJobResult } from '../../types/product.types';

export async function processProductListingSync(
    job: Job<ProductListingSyncJobData>,
): Promise<ProductListingSyncJobResult> {
    const product = await ProductRepository.findForListingSync(job.data.productId);

    if (!product) {
        throw new Error(`Active product ${job.data.productId} was not found`);
    }

    appWinston.info(
        `Product listing sync job ${job.id} found ${product.externalListings.length} active listings for product ${product.id}`,
    );

    if (job.data.requestedByUserId) {
        emitProductListingSyncStatusChanged(job.data.requestedByUserId, {
            jobId: job.id!,
            productId: product.id,
            status: INTEGRATION_SYNC_STATUSES.SYNCED,
            error: null,
        });
    }

    return {
        productId: product.id,
        activeListingsCount: product.externalListings.length,
    };
}
