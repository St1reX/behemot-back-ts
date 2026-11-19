export interface ProductListingTemplateResponse {
    id: string;
    name: string;
    titleTemplate: string;
    summaryTemplate: string;
    descriptionTemplate: string;
    department: {
        id: string;
        name: string;
        shortcut: string;
    };
    createdAt: Date;
    updatedAt: Date;
}

export interface DeleteProductListingTemplateResponse {
    message: string;
}

export interface ProductListingPlaceholderResponse {
    name: string;
    label: string;
    description: string;
    optional: boolean;
    example: string;
}

export interface ProductListingTemplatePreviewResponse {
    title: string;
    summary: string;
    description: string;
}
