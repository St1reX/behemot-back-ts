import { ProductPlaceholderValues } from './buildProductPlaceholderValues';

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
): string {
    return template.replace(PLACEHOLDER_PATTERN, (placeholder, rawPlaceholderName: string) => {
        const placeholderName = rawPlaceholderName.trim();

        if (!(placeholderName in placeholderValues)) {
            throw new ProductListingTemplateRenderError(
                `Unknown listing template placeholder ${placeholder}`,
            );
        }

        const placeholderValue = placeholderValues[placeholderName];

        if (placeholderValue === null) {
            throw new ProductListingTemplateRenderError(
                `Listing template placeholder ${placeholder} has no value`,
            );
        }

        return placeholderValue;
    });
}
