import { mapProductListingContent } from '../../productListingTemplate/mappers/productListingContentMapper';
import type { ProductRepository } from '../repositories/productRepository';
import { ProductResponse } from '../types/product.types';

type ProductWithListingData = NonNullable<Awaited<ReturnType<typeof ProductRepository.findById>>>;

export function mapProductResponse(product: ProductWithListingData): ProductResponse {
    const { title, summary, description, listingContentError } =
        mapProductListingContent(product);
    const primaryFitment =
        product.productFitments.find((productFitment) => productFitment.isPrimary) ?? null;

    return {
        ...product,
        listingTemplate: {
            id: product.listingTemplate.id,
            name: product.listingTemplate.name,
        },
        title,
        summary,
        description,
        listingContentError,
        primaryFitment,
    };
}
