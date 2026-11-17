import { OperationStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError, ErrorNames } from '../../errors/errorHandler';
import { createAuditLog } from '../../infrastructure/audit/auditLogger';
import { ACTIONS } from '../../shared/constants/actions';
import { ENTITIES } from '../../shared/constants/entities';
import { mapProductListingContent } from '../productListingTemplate/utils/rendering/mapProductListingContent';
import { enqueueProductListingSync } from './jobs/listingSync/productListingSync.queue';
import { CreateProductDTO, UpdateProductDTO } from './schemas/product.schema';
import { DeleteProductResponse, ProductResponse } from './types/product.types';

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

type ProductWithListingData = Omit<
    ProductResponse,
    'title' | 'summary' | 'description' | 'listingContentError' | 'primaryFitment' | 'listingTemplate'
> & {
    listingTemplate: {
        id: string;
        name: string;
        titleTemplate: string;
        summaryTemplate: string;
        descriptionTemplate: string;
    };
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

export class ProductService {
    static async getProducts(): Promise<ProductResponse[]> {
        const products = await prisma.product.findMany({
            where: {
                deletedAt: null,
                ...activeProductRelationsWhere,
            },
            select: productSelect,
            orderBy: {
                createdAt: 'desc',
            },
        });

        return products.map((product) => this.mapProductResponse(product));
    }

    static async getProduct(productId: string): Promise<ProductResponse> {
        const product = await prisma.product.findFirst({
            where: {
                id: productId,
                deletedAt: null,
                ...activeProductRelationsWhere,
            },
            select: productSelect,
        });

        if (!product) {
            throw new AppError(ErrorNames.RESOURCE_NOT_FOUND, 404, 'Product not found');
        }

        return this.mapProductResponse(product);
    }

    static async createProduct(productData: CreateProductDTO): Promise<ProductResponse> {
        await this.ensureProductRelationsExist(productData);
        await this.ensureProductDataIsAvailable(productData);

        const createdProduct = await prisma.product.create({
            data: productData,
            select: productSelect,
        });
        const createdProductResponse = this.mapProductResponse(createdProduct);

        await createAuditLog({
            entityName: ENTITIES.PRODUCT,
            entityId: createdProduct.id,
            action: ACTIONS.CREATE,
            operationStatus: OperationStatus.SUCCESS,
            dataBefore: null,
            dataAfter: createdProductResponse,
        });

        return createdProductResponse;
    }

    static async updateProduct(
        productId: string,
        productData: UpdateProductDTO,
    ): Promise<ProductResponse> {
        const existingProduct = await this.getProduct(productId);

        await this.ensureProductRelationsExist(productData);
        await this.ensureProductDataIsAvailable(productData, productId);

        const updatedProduct = await prisma.product.update({
            where: {
                id: productId,
                deletedAt: null,
            },
            data: productData,
            select: productSelect,
        });
        const updatedProductResponse = this.mapProductResponse(updatedProduct);

        await createAuditLog({
            entityName: ENTITIES.PRODUCT,
            entityId: productId,
            action: ACTIONS.UPDATE,
            operationStatus: OperationStatus.SUCCESS,
            dataBefore: existingProduct,
            dataAfter: updatedProductResponse,
        });

        await enqueueProductListingSync(productId);

        return updatedProductResponse;
    }

    static async deleteProduct(productId: string): Promise<DeleteProductResponse> {
        const existingProduct = await this.getProduct(productId);
        const deletedAt = new Date();

        await prisma.$transaction([
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

        await createAuditLog({
            entityName: ENTITIES.PRODUCT,
            entityId: productId,
            action: ACTIONS.DELETE,
            operationStatus: OperationStatus.SUCCESS,
            dataBefore: existingProduct,
            dataAfter: null,
        });

        return {
            message: 'Product has been deleted successfully',
        };
    }

    private static async ensureProductRelationsExist(
        productData: CreateProductDTO | UpdateProductDTO,
    ) {
        const [warehouse, listingTemplate, department, producer] = await Promise.all([
            prisma.warehouse.findFirst({
                where: {
                    id: productData.warehouseId,
                    deletedAt: null,
                },
                select: {
                    id: true,
                },
            }),
            prisma.productListingTemplate.findFirst({
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
            }),
            prisma.department.findFirst({
                where: {
                    id: productData.departmentId,
                    deletedAt: null,
                },
                select: {
                    id: true,
                },
            }),
            prisma.producer.findFirst({
                where: {
                    id: productData.producerId,
                    deletedAt: null,
                },
                select: {
                    id: true,
                },
            }),
        ]);

        if (!warehouse) {
            throw new AppError(ErrorNames.RESOURCE_NOT_FOUND, 404, 'Warehouse not found');
        }

        if (!department) {
            throw new AppError(ErrorNames.RESOURCE_NOT_FOUND, 404, 'Department not found');
        }

        if (!listingTemplate) {
            throw new AppError(
                ErrorNames.RESOURCE_NOT_FOUND,
                404,
                'Product listing template not found for selected department',
            );
        }

        if (!producer) {
            throw new AppError(ErrorNames.RESOURCE_NOT_FOUND, 404, 'Producer not found');
        }
    }

    private static async ensureProductDataIsAvailable(
        productData: CreateProductDTO | UpdateProductDTO,
        excludedProductId?: string,
    ) {
        const existingProduct = await prisma.product.findFirst({
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

        if (existingProduct) {
            throw new AppError(ErrorNames.CONFLICT, 409, 'Product SKU or EAN is already in use');
        }
    }

    private static mapProductResponse(product: ProductWithListingData): ProductResponse {
        const { title, summary, description, listingContentError } =
            mapProductListingContent(product);
        const primaryFitment =
            product.productFitments.find((productFitment) => productFitment.isPrimary) ?? null;

        return {
            ...product,
            listingTemplate: {
                id: product.listingTemplate.id,
                name: product.listingTemplate.name,
            },
            title,
            summary,
            description,
            listingContentError,
            primaryFitment,
        };
    }
}
