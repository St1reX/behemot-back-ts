import { Prisma } from '@prisma/client';
import { ProductSide } from '../../../shared/constants/productSides';

export interface ProductResponse {
    id: string;
    title: string | null;
    summary: string | null;
    description: string | null;
    listingContentError: string | null;
    imagesUrls: string[];
    descriptionImagesUrls: string[];
    price: Prisma.Decimal;
    quantity: number;
    customName: string | null;
    internalNote: string | null;
    side: ProductSide;
    weight: Prisma.Decimal;
    length: Prisma.Decimal;
    width: Prisma.Decimal;
    height: Prisma.Decimal | null;
    sku: string;
    ean: string | null;
    oem: string[];
    warehouseLocation: string;
    warehouse: {
        id: string;
        name: string;
    };
    listingTemplate: {
        id: string;
        name: string;
    };
    department: {
        id: string;
        name: string;
        shortcut: string;
    };
    producer: {
        id: string;
        name: string;
    };
    primaryFitment: ProductResponseFitment | null;
    productFitments: ProductResponseFitment[];
    createdAt: Date;
    updatedAt: Date;
}

export interface ProductResponseFitment {
    id: string;
    isPrimary: boolean;
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
}

export interface DeleteProductResponse {
    message: string;
}

export interface ProductListingSyncJobData {
    productId: string;
    requestedByUserId?: string;
}

export interface ProductListingSyncJobResult {
    productId: string;
    activeListingsCount: number;
}
