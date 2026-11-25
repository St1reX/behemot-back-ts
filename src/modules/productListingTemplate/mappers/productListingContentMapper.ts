import { prepareListingHtml } from '../utils/rendering/listingHtml';
import { buildProductPlaceholderValues } from '../utils/rendering/buildProductPlaceholderValues';
import {
    ProductListingTemplateRenderError,
    renderProductListingTemplate,
} from '../utils/rendering/renderProductListingTemplate';

type ProductListingContentData = Parameters<typeof buildProductPlaceholderValues>[0] & {
    customSummary?: string | null;
    customDescription?: string | null;
    listingTemplate: {
        titleTemplate: string;
        summaryTemplate: string;
        descriptionTemplate: string;
    } | null;
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
        if (!product.listingTemplate) {
            throw new ProductListingTemplateRenderError('Nie podano szablonu oferty.');
        }
        const placeholderValues = buildProductPlaceholderValues(product);

        return {
            title: renderProductListingTemplate(
                product.listingTemplate.titleTemplate,
                placeholderValues,
            ),
            summary: product.customSummary !== null && product.customSummary !== undefined ? prepareListingHtml(product.customSummary) : renderProductListingTemplate(
                product.listingTemplate.summaryTemplate,
                placeholderValues,
                true,
            ),
            description: product.customDescription !== null && product.customDescription !== undefined ? prepareListingHtml(product.customDescription) : renderProductListingTemplate(
                product.listingTemplate.descriptionTemplate,
                placeholderValues,
                true,
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
