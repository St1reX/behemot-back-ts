import { OperationStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError, ErrorNames } from '../../errors/errorHandler';
import { createAuditLog } from '../../infrastructure/audit/auditLogger';
import { ACTIONS } from '../../shared/constants/actions';
import { ENTITIES } from '../../shared/constants/entities';
import {
    CreateProductFitmentDTO,
    UpdateProductFitmentDTO,
} from './schemas/productFitment.schema';
import {
    DeleteProductFitmentResponse,
    ProductFitmentResponse,
} from './types/productFitment.types';

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

export class ProductFitmentService {
    static async getProductFitments(): Promise<ProductFitmentResponse[]> {
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

    static async getProductFitment(productFitmentId: string): Promise<ProductFitmentResponse> {
        const productFitment = await prisma.productFitment.findFirst({
            where: {
                id: productFitmentId,
                deletedAt: null,
                ...activeProductFitmentRelationsWhere,
            },
            select: productFitmentSelect,
        });

        if (!productFitment) {
            throw new AppError(ErrorNames.RESOURCE_NOT_FOUND, 404, 'Product fitment not found');
        }

        return productFitment;
    }

    static async createProductFitment(
        productFitmentData: CreateProductFitmentDTO,
    ): Promise<ProductFitmentResponse> {
        await this.ensureRelationsExist(productFitmentData);
        await this.ensureProductFitmentDataIsAvailable(productFitmentData);

        const createdProductFitment = await prisma.productFitment.create({
            data: productFitmentData,
            select: productFitmentSelect,
        });

        await createAuditLog({
            entityName: ENTITIES.PRODUCT_FITMENT,
            entityId: createdProductFitment.id,
            action: ACTIONS.CREATE,
            operationStatus: OperationStatus.SUCCESS,
            dataBefore: null,
            dataAfter: createdProductFitment,
        });

        return createdProductFitment;
    }

    static async updateProductFitment(
        productFitmentId: string,
        productFitmentData: UpdateProductFitmentDTO,
    ): Promise<ProductFitmentResponse> {
        const existingProductFitment = await this.getProductFitment(productFitmentId);

        await this.ensureRelationsExist(productFitmentData);
        await this.ensureProductFitmentDataIsAvailable(productFitmentData, productFitmentId);

        const updatedProductFitment = await prisma.productFitment.update({
            where: {
                id: productFitmentId,
                deletedAt: null,
            },
            data: productFitmentData,
            select: productFitmentSelect,
        });

        await createAuditLog({
            entityName: ENTITIES.PRODUCT_FITMENT,
            entityId: productFitmentId,
            action: ACTIONS.UPDATE,
            operationStatus: OperationStatus.SUCCESS,
            dataBefore: existingProductFitment,
            dataAfter: updatedProductFitment,
        });

        return updatedProductFitment;
    }

    static async deleteProductFitment(
        productFitmentId: string,
    ): Promise<DeleteProductFitmentResponse> {
        const existingProductFitment = await this.getProductFitment(productFitmentId);

        if (existingProductFitment.isPrimary) {
            throw new AppError(
                ErrorNames.CONFLICT,
                409,
                'Primary product fitment cannot be deleted',
            );
        }

        await prisma.productFitment.update({
            where: {
                id: productFitmentId,
                deletedAt: null,
            },
            data: {
                deletedAt: new Date(),
            },
        });

        await createAuditLog({
            entityName: ENTITIES.PRODUCT_FITMENT,
            entityId: productFitmentId,
            action: ACTIONS.DELETE,
            operationStatus: OperationStatus.SUCCESS,
            dataBefore: existingProductFitment,
            dataAfter: null,
        });

        return {
            message: 'Product fitment has been deleted successfully',
        };
    }

    private static async ensureRelationsExist(
        productFitmentData: CreateProductFitmentDTO | UpdateProductFitmentDTO,
    ) {
        const [product, carGeneration] = await Promise.all([
            prisma.product.findFirst({
                where: {
                    id: productFitmentData.productId,
                    deletedAt: null,
                },
                select: {
                    id: true,
                },
            }),
            prisma.carGeneration.findFirst({
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
            }),
        ]);

        if (!product) {
            throw new AppError(ErrorNames.RESOURCE_NOT_FOUND, 404, 'Product not found');
        }

        if (!carGeneration) {
            throw new AppError(ErrorNames.RESOURCE_NOT_FOUND, 404, 'Car generation not found');
        }
    }

    private static async ensureProductFitmentDataIsAvailable(
        productFitmentData: CreateProductFitmentDTO | UpdateProductFitmentDTO,
        excludedProductFitmentId?: string,
    ) {
        const existingProductFitment = await prisma.productFitment.findFirst({
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

        if (!existingProductFitment) {
            return;
        }

        if (existingProductFitment.carGenerationId === productFitmentData.carGenerationId) {
            throw new AppError(
                ErrorNames.CONFLICT,
                409,
                'Product fitment already exists for selected car generation',
            );
        }

        throw new AppError(
            ErrorNames.CONFLICT,
            409,
            'Product already has a primary fitment',
        );
    }
}
