import { prisma } from '../../../config/database';
import {
    CreateProductCrossReferenceDTO,
    UpdateProductCrossReferenceDTO,
} from '../schemas/productCrossReference.schema';

const productCrossReferenceSelect = {
    id: true,
    product: {
        select: {
            id: true,
            sku: true,
        },
    },
    contractor: {
        select: {
            id: true,
            name: true,
        },
    },
    contractorSku: true,
    contractorEan: true,
    createdAt: true,
    updatedAt: true,
};

const activeProductCrossReferenceRelationsWhere = {
    product: {
        deletedAt: null,
    },
    contractor: {
        deletedAt: null,
    },
};

export class ProductCrossReferenceRepository {
    static findAll() {
        return prisma.productCrossReference.findMany({
            where: {
                deletedAt: null,
                ...activeProductCrossReferenceRelationsWhere,
            },
            select: productCrossReferenceSelect,
            orderBy: [
                {
                    product: {
                        sku: 'asc',
                    },
                },
                {
                    contractor: {
                        name: 'asc',
                    },
                },
            ],
        });
    }

    static findById(productCrossReferenceId: string) {
        return prisma.productCrossReference.findFirst({
            where: {
                id: productCrossReferenceId,
                deletedAt: null,
                ...activeProductCrossReferenceRelationsWhere,
            },
            select: productCrossReferenceSelect,
        });
    }

    static create(productCrossReferenceData: CreateProductCrossReferenceDTO) {
        return prisma.productCrossReference.create({
            data: productCrossReferenceData,
            select: productCrossReferenceSelect,
        });
    }

    static update(
        productCrossReferenceId: string,
        productCrossReferenceData: UpdateProductCrossReferenceDTO,
    ) {
        return prisma.productCrossReference.update({
            where: {
                id: productCrossReferenceId,
                deletedAt: null,
            },
            data: productCrossReferenceData,
            select: productCrossReferenceSelect,
        });
    }

    static softDelete(productCrossReferenceId: string) {
        return prisma.productCrossReference.update({
            where: {
                id: productCrossReferenceId,
                deletedAt: null,
            },
            data: {
                deletedAt: new Date(),
            },
        });
    }

    static findActiveProduct(
        productCrossReferenceData: CreateProductCrossReferenceDTO | UpdateProductCrossReferenceDTO,
    ) {
        return prisma.product.findFirst({
            where: {
                id: productCrossReferenceData.productId,
                deletedAt: null,
            },
            select: {
                id: true,
            },
        });
    }

    static findActiveContractor(
        productCrossReferenceData: CreateProductCrossReferenceDTO | UpdateProductCrossReferenceDTO,
    ) {
        return prisma.contractor.findFirst({
            where: {
                id: productCrossReferenceData.contractorId,
                deletedAt: null,
            },
            select: {
                id: true,
            },
        });
    }

    static findConflictingCrossReference(
        productCrossReferenceData: CreateProductCrossReferenceDTO | UpdateProductCrossReferenceDTO,
        excludedProductCrossReferenceId?: string,
    ) {
        return prisma.productCrossReference.findFirst({
            where: {
                id: excludedProductCrossReferenceId
                    ? {
                        not: excludedProductCrossReferenceId,
                    }
                    : undefined,
                deletedAt: null,
                OR: [
                    {
                        productId: productCrossReferenceData.productId,
                        contractorId: productCrossReferenceData.contractorId,
                        contractorSku: productCrossReferenceData.contractorSku,
                    },
                    ...(productCrossReferenceData.contractorEan
                        ? [
                            {
                                contractorEan: productCrossReferenceData.contractorEan,
                            },
                        ]
                        : []),
                ],
            },
            select: {
                id: true,
            },
        });
    }
}
