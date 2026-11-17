export interface ProductCrossReferenceResponse {
    id: string;
    product: {
        id: string;
        sku: string;
    };
    contractor: {
        id: string;
        name: string;
    };
    contractorSku: string;
    contractorEan: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface DeleteProductCrossReferenceResponse {
    message: string;
}
