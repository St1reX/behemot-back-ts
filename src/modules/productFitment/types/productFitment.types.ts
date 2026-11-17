export interface ProductFitmentResponse {
    id: string;
    product: {
        id: string;
        sku: string;
    };
    carGeneration: {
        id: string;
        startProduction: number;
        endProduction: number | null;
        carModel: {
            id: string;
            name: string;
            carBrand: {
                id: string;
                name: string;
            };
        };
    };
    isPrimary: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface DeleteProductFitmentResponse {
    message: string;
}
