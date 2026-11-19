import { ProductPlaceholderValues } from './buildProductPlaceholderValues';
import { escapeListingText, prepareListingHtml } from './listingHtml';

const PLACEHOLDER_PATTERN = /{{\s*([^{}]+?)\s*}}/g;

export class ProductListingTemplateRenderError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ProductListingTemplateRenderError';
    }
}

export function renderProductListingTemplate(
    template: string,
    placeholderValues: ProductPlaceholderValues,
    html = false,
): string {
    const content = html ? prepareListingHtml(template) : template;
    return content.replace(PLACEHOLDER_PATTERN, (placeholder, rawPlaceholderName: string) => {
        const placeholderName = rawPlaceholderName.trim();

        if (!Object.prototype.hasOwnProperty.call(placeholderValues, placeholderName)) {
            throw new ProductListingTemplateRenderError(
                `Unknown listing template placeholder ${placeholder}`,
            );
        }

        const placeholderValue = placeholderValues[placeholderName as keyof ProductPlaceholderValues];

        if (placeholderValue === null) {
            throw new ProductListingTemplateRenderError(
                `Listing template placeholder ${placeholder} has no value`,
            );
        }

        return html ? escapeListingText(placeholderValue) : placeholderValue;
    });
}
