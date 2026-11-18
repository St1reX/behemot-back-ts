import { buildProductPlaceholderValues } from '../utils/rendering/buildProductPlaceholderValues';
import {
    ProductListingTemplateRenderError,
    renderProductListingTemplate,
} from '../utils/rendering/renderProductListingTemplate';

type ProductListingContentData = Parameters<typeof buildProductPlaceholderValues>[0] & {
    listingTemplate: {
        titleTemplate: string;
        summaryTemplate: string;
        descriptionTemplate: string;
    };
};

export interface ProductListingContent {
    title: string | null;
    summary: string | null;
    description: string | null;
    listingContentError: string | null;
}

export function mapProductListingContent(
    product: ProductListingContentData,
): ProductListingContent {
    try {
        const placeholderValues = buildProductPlaceholderValues(product);

        return {
            title: renderProductListingTemplate(
                product.listingTemplate.titleTemplate,
                placeholderValues,
            ),
            summary: renderProductListingTemplate(
                product.listingTemplate.summaryTemplate,
                placeholderValues,
            ),
            description: renderProductListingTemplate(
                product.listingTemplate.descriptionTemplate,
                placeholderValues,
            ),
            listingContentError: null,
        };
    } catch (error) {
        if (error instanceof ProductListingTemplateRenderError) {
            return {
                title: null,
                summary: null,
                description: null,
                listingContentError: error.message,
            };
        }

        throw error;
    }
}
