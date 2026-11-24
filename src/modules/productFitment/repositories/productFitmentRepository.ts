import { validateProductFitments } from '../validateProductFitments';
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
    carBrand: { select: { id: true, name: true } },
    carModel: { select: { id: true, name: true, carBrand: { select: { id: true, name: true } } } },
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
    AND: [
        { OR: [{ carBrandId: null }, { carBrand: { deletedAt: null } }] },
        { OR: [{ carModelId: null }, { carModel: { deletedAt: null, carBrand: { deletedAt: null } } }] },
        { OR: [{ carGenerationId: null }, { carGeneration: { deletedAt: null, carModel: { deletedAt: null, carBrand: { deletedAt: null } } } }] },
    ],
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
        return prisma.$transaction(async (tx) => {
            await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${productFitmentData.productId} FOR UPDATE`;
            const [fitment] = await validateProductFitments(tx, [productFitmentData]);
            const { id: _id, ...data } = fitment;
            return tx.productFitment.create({ data: { ...data, productId: productFitmentData.productId }, select: productFitmentSelect });
        });
    }

    static update(productFitmentId: string, productFitmentData: UpdateProductFitmentDTO) {
        return prisma.$transaction(async (tx) => {
            await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${productFitmentData.productId} FOR UPDATE`;
            const [fitment] = await validateProductFitments(tx, [productFitmentData]);
            const { id: _id, ...data } = fitment;
            return tx.productFitment.update({ where: { id: productFitmentId, deletedAt: null }, data: { ...data, productId: productFitmentData.productId }, select: productFitmentSelect });
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

    static normalizeFitment(data: CreateProductFitmentDTO | UpdateProductFitmentDTO) {
        return validateProductFitments(prisma, [data]);
    }

    static countActiveListings(productFitmentId: string) {
        return prisma.productExternalListingFitment.count({ where: {
            productFitmentId, deletedAt: null, externalListing: { deletedAt: null },
        } });
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
                        carBrandId: productFitmentData.carBrandId,
                        carModelId: productFitmentData.carModelId,
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
                carBrandId: true,
                carModelId: true,
                carGenerationId: true,
                isPrimary: true,
            },
        });
    }
}
