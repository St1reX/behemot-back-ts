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
