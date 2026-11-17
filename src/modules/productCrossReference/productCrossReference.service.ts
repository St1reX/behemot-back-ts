import { OperationStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError, ErrorNames } from '../../errors/errorHandler';
import { createAuditLog } from '../../infrastructure/audit/auditLogger';
import { ACTIONS } from '../../shared/constants/actions';
import { ENTITIES } from '../../shared/constants/entities';
import {
    CreateProductCrossReferenceDTO,
    UpdateProductCrossReferenceDTO,
} from './schemas/productCrossReference.schema';
import {
    DeleteProductCrossReferenceResponse,
    ProductCrossReferenceResponse,
} from './types/productCrossReference.types';

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

export class ProductCrossReferenceService {
    static async getProductCrossReferences(): Promise<ProductCrossReferenceResponse[]> {
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

    static async getProductCrossReference(
        productCrossReferenceId: string,
    ): Promise<ProductCrossReferenceResponse> {
        const productCrossReference = await prisma.productCrossReference.findFirst({
            where: {
                id: productCrossReferenceId,
                deletedAt: null,
                ...activeProductCrossReferenceRelationsWhere,
            },
            select: productCrossReferenceSelect,
        });

        if (!productCrossReference) {
            throw new AppError(
                ErrorNames.RESOURCE_NOT_FOUND,
                404,
                'Product cross reference not found',
            );
        }

        return productCrossReference;
    }

    static async createProductCrossReference(
        productCrossReferenceData: CreateProductCrossReferenceDTO,
    ): Promise<ProductCrossReferenceResponse> {
        await this.ensureRelationsExist(productCrossReferenceData);
        await this.ensureProductCrossReferenceDataIsAvailable(productCrossReferenceData);

        const createdProductCrossReference = await prisma.productCrossReference.create({
            data: productCrossReferenceData,
            select: productCrossReferenceSelect,
        });

        await createAuditLog({
            entityName: ENTITIES.PRODUCT_CROSS_REFERENCE,
            entityId: createdProductCrossReference.id,
            action: ACTIONS.CREATE,
            operationStatus: OperationStatus.SUCCESS,
            dataBefore: null,
            dataAfter: createdProductCrossReference,
        });

        return createdProductCrossReference;
    }

    static async updateProductCrossReference(
        productCrossReferenceId: string,
        productCrossReferenceData: UpdateProductCrossReferenceDTO,
    ): Promise<ProductCrossReferenceResponse> {
        const existingProductCrossReference =
            await this.getProductCrossReference(productCrossReferenceId);

        await this.ensureRelationsExist(productCrossReferenceData);
        await this.ensureProductCrossReferenceDataIsAvailable(
            productCrossReferenceData,
            productCrossReferenceId,
        );

        const updatedProductCrossReference = await prisma.productCrossReference.update({
            where: {
                id: productCrossReferenceId,
                deletedAt: null,
            },
            data: productCrossReferenceData,
            select: productCrossReferenceSelect,
        });

        await createAuditLog({
            entityName: ENTITIES.PRODUCT_CROSS_REFERENCE,
            entityId: productCrossReferenceId,
            action: ACTIONS.UPDATE,
            operationStatus: OperationStatus.SUCCESS,
            dataBefore: existingProductCrossReference,
            dataAfter: updatedProductCrossReference,
        });

        return updatedProductCrossReference;
    }

    static async deleteProductCrossReference(
        productCrossReferenceId: string,
    ): Promise<DeleteProductCrossReferenceResponse> {
        const existingProductCrossReference =
            await this.getProductCrossReference(productCrossReferenceId);

        await prisma.productCrossReference.update({
            where: {
                id: productCrossReferenceId,
                deletedAt: null,
            },
            data: {
                deletedAt: new Date(),
            },
        });

        await createAuditLog({
            entityName: ENTITIES.PRODUCT_CROSS_REFERENCE,
            entityId: productCrossReferenceId,
            action: ACTIONS.DELETE,
            operationStatus: OperationStatus.SUCCESS,
            dataBefore: existingProductCrossReference,
            dataAfter: null,
        });

        return {
            message: 'Product cross reference has been deleted successfully',
        };
    }

    private static async ensureRelationsExist(
        productCrossReferenceData:
            | CreateProductCrossReferenceDTO
            | UpdateProductCrossReferenceDTO,
    ) {
        const [product, contractor] = await Promise.all([
            prisma.product.findFirst({
                where: {
                    id: productCrossReferenceData.productId,
                    deletedAt: null,
                },
                select: {
                    id: true,
                },
            }),
            prisma.contractor.findFirst({
                where: {
                    id: productCrossReferenceData.contractorId,
                    deletedAt: null,
                },
                select: {
                    id: true,
                },
            }),
        ]);

        if (!product) {
            throw new AppError(ErrorNames.RESOURCE_NOT_FOUND, 404, 'Product not found');
        }

        if (!contractor) {
            throw new AppError(ErrorNames.RESOURCE_NOT_FOUND, 404, 'Contractor not found');
        }
    }

    private static async ensureProductCrossReferenceDataIsAvailable(
        productCrossReferenceData:
            | CreateProductCrossReferenceDTO
            | UpdateProductCrossReferenceDTO,
        excludedProductCrossReferenceId?: string,
    ) {
        const existingProductCrossReference = await prisma.productCrossReference.findFirst({
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

        if (existingProductCrossReference) {
            throw new AppError(
                ErrorNames.CONFLICT,
                409,
                'Product cross reference data is already in use',
            );
        }
    }
}
