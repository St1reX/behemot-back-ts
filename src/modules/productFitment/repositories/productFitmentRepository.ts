import { prisma } from '../../../config/database';
import {
    CreateProductFitmentDTO,
    UpdateProductFitmentDTO,
} from '../schemas/productFitment.schema';

const productFitmentSelect = {
    id: true,
    product: {
        select: {
            id: true,
            sku: true,
        },
    },
    carGeneration: {
        select: {
            id: true,
            startProduction: true,
            endProduction: true,
            carModel: {
                select: {
                    id: true,
                    name: true,
                    carBrand: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            },
        },
    },
    isPrimary: true,
    createdAt: true,
    updatedAt: true,
};

const activeProductFitmentRelationsWhere = {
    product: {
        deletedAt: null,
    },
    carGeneration: {
        deletedAt: null,
        carModel: {
            deletedAt: null,
            carBrand: {
                deletedAt: null,
            },
        },
    },
};

export class ProductFitmentRepository {
    static findAll() {
        return prisma.productFitment.findMany({
            where: {
                deletedAt: null,
                ...activeProductFitmentRelationsWhere,
            },
            select: productFitmentSelect,
            orderBy: [
                {
                    product: {
                        sku: 'asc',
                    },
                },
                {
                    isPrimary: 'desc',
                },
            ],
        });
    }

    static findById(productFitmentId: string) {
        return prisma.productFitment.findFirst({
            where: {
                id: productFitmentId,
                deletedAt: null,
                ...activeProductFitmentRelationsWhere,
            },
            select: productFitmentSelect,
        });
    }

    static create(productFitmentData: CreateProductFitmentDTO) {
        return prisma.productFitment.create({
            data: productFitmentData,
            select: productFitmentSelect,
        });
    }

    static update(productFitmentId: string, productFitmentData: UpdateProductFitmentDTO) {
        return prisma.productFitment.update({
            where: {
                id: productFitmentId,
                deletedAt: null,
            },
            data: productFitmentData,
            select: productFitmentSelect,
        });
    }

    static softDelete(productFitmentId: string) {
        return prisma.productFitment.update({
            where: {
                id: productFitmentId,
                deletedAt: null,
            },
            data: {
                deletedAt: new Date(),
            },
        });
    }

    static findActiveProduct(productFitmentData: CreateProductFitmentDTO | UpdateProductFitmentDTO) {
        return prisma.product.findFirst({
            where: {
                id: productFitmentData.productId,
                deletedAt: null,
            },
            select: {
                id: true,
            },
        });
    }

    static findActiveCarGeneration(
        productFitmentData: CreateProductFitmentDTO | UpdateProductFitmentDTO,
    ) {
        return prisma.carGeneration.findFirst({
            where: {
                id: productFitmentData.carGenerationId,
                deletedAt: null,
                carModel: {
                    deletedAt: null,
                    carBrand: {
                        deletedAt: null,
                    },
                },
            },
            select: {
                id: true,
            },
        });
    }

    static findConflictingFitment(
        productFitmentData: CreateProductFitmentDTO | UpdateProductFitmentDTO,
        excludedProductFitmentId?: string,
    ) {
        return prisma.productFitment.findFirst({
            where: {
                id: excludedProductFitmentId
                    ? {
                        not: excludedProductFitmentId,
                    }
                    : undefined,
                deletedAt: null,
                productId: productFitmentData.productId,
                OR: [
                    {
                        carGenerationId: productFitmentData.carGenerationId,
                    },
                    ...(productFitmentData.isPrimary
                        ? [
                            {
                                isPrimary: true,
                            },
                        ]
                        : []),
                ],
            },
            select: {
                id: true,
                carGenerationId: true,
                isPrimary: true,
            },
        });
    }
}
