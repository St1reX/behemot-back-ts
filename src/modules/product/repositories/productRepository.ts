import { PRODUCT_CONTENT_VERSIONS } from '../constants/productVersions';
import { AppError, ErrorNames } from '../../../errors/errorHandler';
import { validateProductFitments } from '../../productFitment/validateProductFitments';
import { prisma } from '../../../config/database';
import { CreateProductDTO, UpdateProductDTO } from '../schemas/product.schema';

const productSelect = {
    id: true,
    isLegacy: true,
    contentVersion: true,
    imagesUrls: true,
    descriptionImagesUrls: true,
    price: true,
    quantity: true,
    customName: true,
    customSummary: true,
    customDescription: true,
    internalNote: true,
    side: true,
    weight: true,
    length: true,
    width: true,
    height: true,
    sku: true,
    ean: true,
    oem: true,
    warehouseLocation: true,
    warehouse: {
        select: {
            id: true,
            name: true,
        },
    },
    listingTemplate: {
        select: {
            id: true,
            name: true,
            titleTemplate: true,
            summaryTemplate: true,
            descriptionTemplate: true,
        },
    },
    department: {
        select: {
            id: true,
            name: true,
            shortcut: true,
        },
    },
    producer: {
        select: {
            id: true,
            name: true,
        },
    },
    productFitments: {
        where: {
            deletedAt: null,
            AND: [
                { OR: [{ carBrandId: null }, { carBrand: { deletedAt: null } }] },
                { OR: [{ carModelId: null }, { carModel: { deletedAt: null, carBrand: { deletedAt: null } } }] },
                { OR: [{ carGenerationId: null }, { carGeneration: { deletedAt: null, carModel: { deletedAt: null, carBrand: { deletedAt: null } } } }] },
            ],
        },
        select: {
            id: true,
            isPrimary: true,
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
        },
        orderBy: {
            isPrimary: 'desc' as const,
        },
    },
    externalListings: {
        where: { deletedAt: null },
        select: {
            id: true,
            integrationId: true,
            integration: { select: { id: true, name: true } },
            channel: true,
            externalId: true,
            syncStatus: true,
            lastSyncedAt: true,
            lastError: true,
            lastSyncedContentVersion: true,
        },
    },
    createdAt: true,
    updatedAt: true,
};

const activeProductRelationsWhere = {
    AND: [
        { OR: [{ warehouseId: null }, { warehouse: { deletedAt: null } }] },
        { OR: [{ listingTemplateId: null }, { listingTemplate: { deletedAt: null } }] },
        { OR: [{ departmentId: null }, { department: { deletedAt: null } }] },
        { OR: [{ producerId: null }, { producer: { deletedAt: null } }] },
    ],
};

export class ProductRepository {
    static findAll() {
        return prisma.product.findMany({
            where: {
                deletedAt: null,
                ...activeProductRelationsWhere,
            },
            select: productSelect,
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    static findById(productId: string) {
        return prisma.product.findFirst({
            where: {
                id: productId,
                deletedAt: null,
                ...activeProductRelationsWhere,
            },
            select: productSelect,
        });
    }

    static create(productData: CreateProductDTO) {
        return prisma.$transaction(async (tx) => {
            const { productFitments, ...data } = productData;
            const fitments = await validateProductFitments(tx, productFitments ?? []);
            return tx.product.create({
                data: { ...data, isLegacy: false, contentVersion: PRODUCT_CONTENT_VERSIONS.INITIAL, productFitments: { create: fitments.map(({ id: _id, ...fitment }) => fitment) } },
                select: productSelect,
            });
        });
    }

    static update(productId: string, productData: UpdateProductDTO) {
        return prisma.$transaction(async (tx) => {
            await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${productId} FOR UPDATE`;
            const { productFitments, ...data } = productData;
            if (productFitments !== undefined) {
                const fitments = await validateProductFitments(tx, productFitments);
                const existing = await tx.productFitment.findMany({ where: { productId, deletedAt: null }, select: { id: true } });
                if (fitments.some((fitment) => fitment.id && !existing.some((item) => item.id === fitment.id))) {
                    throw new AppError(ErrorNames.CONFLICT, 409, 'Dopasowanie nie należy do produktu lub zostało usunięte. Odśwież dane.');
                }
                const removedIds = existing.filter((item) => !fitments.some((fitment) => fitment.id === item.id)).map((item) => item.id);
                const linked = await tx.productExternalListingFitment.count({ where: {
                    productFitmentId: { in: removedIds }, deletedAt: null, externalListing: { deletedAt: null },
                } });
                if (linked) throw new AppError(ErrorNames.CONFLICT, 409, 'Nie można usunąć dopasowania powiązanego z ofertą zewnętrzną.');
                await tx.productFitment.updateMany({ where: { id: { in: removedIds } }, data: { deletedAt: new Date(), isPrimary: false } });
                // Clear primary flags before changing the primary fitment (partial unique index).
                await tx.productFitment.updateMany({ where: { productId, deletedAt: null }, data: { isPrimary: false } });
                // Temporarily retire retained rows to allow exchanging vehicle assignments without collisions.
                await tx.productFitment.updateMany({ where: { productId, deletedAt: null }, data: { deletedAt: new Date() } });
                for (const { id, ...fitment } of fitments) {
                    if (id) await tx.productFitment.update({ where: { id }, data: { ...fitment, deletedAt: null } });
                    else await tx.productFitment.create({ data: { ...fitment, productId } });
                }
            }
            return tx.product.update({ where: { id: productId, deletedAt: null }, data: { ...data, isLegacy: false, contentVersion: { increment: 1 } }, select: productSelect });
        });
    }

    static softDeleteWithRelations(productId: string, deletedAt: Date) {
        return prisma.$transaction(async (tx) => {
            const fitments = await tx.productFitment.findMany({ where: { productId, deletedAt: null } });
            const crossReferences = await tx.productCrossReference.findMany({ where: { productId, deletedAt: null } });
            await tx.productFitment.updateMany({
                where: {
                    id: { in: fitments.map((fitment) => fitment.id) },
                    deletedAt: null,
                },
                data: {
                    deletedAt,
                },
            });
            await tx.productCrossReference.updateMany({
                where: {
                    id: { in: crossReferences.map((reference) => reference.id) },
                    deletedAt: null,
                },
                data: {
                    deletedAt,
                },
            });
            await tx.product.update({
                where: {
                    id: productId,
                    deletedAt: null,
                },
                data: {
                    deletedAt,
                },
            });
            return { fitments, crossReferences };
        });
    }

    static findActiveWarehouse(productData: CreateProductDTO | UpdateProductDTO) {
        return prisma.warehouse.findFirst({
            where: {
                id: productData.warehouseId,
                deletedAt: null,
            },
            select: {
                id: true,
            },
        });
    }

    static findActiveListingTemplate(productData: CreateProductDTO | UpdateProductDTO) {
        return prisma.productListingTemplate.findFirst({
            where: {
                id: productData.listingTemplateId,
                departmentId: productData.departmentId,
                deletedAt: null,
                department: {
                    deletedAt: null,
                },
            },
            select: {
                id: true,
            },
        });
    }

    static findActiveDepartment(productData: CreateProductDTO | UpdateProductDTO) {
        return prisma.department.findFirst({
            where: {
                id: productData.departmentId,
                deletedAt: null,
            },
            select: {
                id: true,
            },
        });
    }

    static findActiveProducer(productData: CreateProductDTO | UpdateProductDTO) {
        return prisma.producer.findFirst({
            where: {
                id: productData.producerId,
                deletedAt: null,
            },
            select: {
                id: true,
            },
        });
    }

    static findConflictingProduct(
        productData: CreateProductDTO | UpdateProductDTO,
        excludedProductId?: string,
    ) {
        return prisma.product.findFirst({
            where: {
                id: excludedProductId
                    ? {
                        not: excludedProductId,
                    }
                    : undefined,
                deletedAt: null,
                sku: productData.sku,
            },
            select: {
                id: true,
            },
        });
    }

    static findReferencingImages(urls: string[]) {
        return prisma.product.findMany({
            where: { OR: [
                { imagesUrls: { hasSome: urls } },
                { descriptionImagesUrls: { hasSome: urls } },
            ] },
            select: { imagesUrls: true, descriptionImagesUrls: true },
        });
    }

    static findForListingSync(productId: string) {
        return prisma.product.findFirst({
            where: {
                id: productId,
                deletedAt: null,
            },
            select: {
                id: true,
                externalListings: {
                    where: {
                        deletedAt: null,
                    },
                    select: {
                        id: true,
                        channel: true,
                        externalId: true,
                    },
                },
            },
        });
    }
}
