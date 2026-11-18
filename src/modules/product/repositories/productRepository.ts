import { prisma } from '../../../config/database';
import { CreateProductDTO, UpdateProductDTO } from '../schemas/product.schema';

const productSelect = {
    id: true,
    imagesUrls: true,
    descriptionImagesUrls: true,
    price: true,
    quantity: true,
    customName: true,
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
            carGeneration: {
                deletedAt: null,
                carModel: {
                    deletedAt: null,
                    carBrand: {
                        deletedAt: null,
                    },
                },
            },
        },
        select: {
            id: true,
            isPrimary: true,
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
    createdAt: true,
    updatedAt: true,
};

const activeProductRelationsWhere = {
    warehouse: {
        deletedAt: null,
    },
    listingTemplate: {
        deletedAt: null,
    },
    department: {
        deletedAt: null,
    },
    producer: {
        deletedAt: null,
    },
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
        return prisma.product.create({
            data: productData,
            select: productSelect,
        });
    }

    static update(productId: string, productData: UpdateProductDTO) {
        return prisma.product.update({
            where: {
                id: productId,
                deletedAt: null,
            },
            data: productData,
            select: productSelect,
        });
    }

    static softDeleteWithRelations(productId: string, deletedAt: Date) {
        return prisma.$transaction([
            prisma.productFitment.updateMany({
                where: {
                    productId,
                    deletedAt: null,
                },
                data: {
                    deletedAt,
                },
            }),
            prisma.productCrossReference.updateMany({
                where: {
                    productId,
                    deletedAt: null,
                },
                data: {
                    deletedAt,
                },
            }),
            prisma.product.update({
                where: {
                    id: productId,
                    deletedAt: null,
                },
                data: {
                    deletedAt,
                },
            }),
        ]);
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
                OR: [
                    {
                        sku: productData.sku,
                    },
                    ...(productData.ean
                        ? [
                            {
                                ean: productData.ean,
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
