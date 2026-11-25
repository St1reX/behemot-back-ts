import { Job } from 'bullmq';
import { appWinston } from '../../../../config/logger/appWinston';
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

    // Real offer updates are disabled until the synchronization implementation is ready.
    appWinston.info(`Product listing sync job ${job.id} skipped: synchronization is not implemented`);

    return {
        productId: product.id,
        activeListingsCount: product.externalListings.length,
        skipped: true,
    };
}
