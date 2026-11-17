import { OperationStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError, ErrorNames } from '../../errors/errorHandler';
import { createAuditLog } from '../../infrastructure/audit/auditLogger';
import { ACTIONS } from '../../shared/constants/actions';
import { ENTITIES } from '../../shared/constants/entities';
import {
    CreateProductListingTemplateDTO,
    UpdateProductListingTemplateDTO,
} from './schemas/productListingTemplate.schema';
import {
    DeleteProductListingTemplateResponse,
    ProductListingTemplateResponse,
} from './types/productListingTemplate.types';

const productListingTemplateSelect = {
    id: true,
    name: true,
    titleTemplate: true,
    summaryTemplate: true,
    descriptionTemplate: true,
    department: {
        select: {
            id: true,
            name: true,
            shortcut: true,
        },
    },
    createdAt: true,
    updatedAt: true,
};

export class ProductListingTemplateService {
    static async getProductListingTemplates(): Promise<ProductListingTemplateResponse[]> {
        return prisma.productListingTemplate.findMany({
            where: {
                deletedAt: null,
                department: {
                    deletedAt: null,
                },
            },
            select: productListingTemplateSelect,
            orderBy: [
                {
                    department: {
                        name: 'asc',
                    },
                },
                {
                    name: 'asc',
                },
            ],
        });
    }

    static async getProductListingTemplate(
        productListingTemplateId: string,
    ): Promise<ProductListingTemplateResponse> {
        const productListingTemplate = await prisma.productListingTemplate.findFirst({
            where: {
                id: productListingTemplateId,
                deletedAt: null,
                department: {
                    deletedAt: null,
                },
            },
            select: productListingTemplateSelect,
        });

        if (!productListingTemplate) {
            throw new AppError(
                ErrorNames.RESOURCE_NOT_FOUND,
                404,
                'Product listing template not found',
            );
        }

        return productListingTemplate;
    }

    static async createProductListingTemplate(
        productListingTemplateData: CreateProductListingTemplateDTO,
    ): Promise<ProductListingTemplateResponse> {
        await this.ensureDepartmentExists(productListingTemplateData.departmentId);
        await this.ensureProductListingTemplateNameIsAvailable(productListingTemplateData.name);

        const createdProductListingTemplate = await prisma.productListingTemplate.create({
            data: productListingTemplateData,
            select: productListingTemplateSelect,
        });

        await createAuditLog({
            entityName: ENTITIES.PRODUCT_LISTING_TEMPLATE,
            entityId: createdProductListingTemplate.id,
            action: ACTIONS.CREATE,
            operationStatus: OperationStatus.SUCCESS,
            dataBefore: null,
            dataAfter: createdProductListingTemplate,
        });

        return createdProductListingTemplate;
    }

    static async updateProductListingTemplate(
        productListingTemplateId: string,
        productListingTemplateData: UpdateProductListingTemplateDTO,
    ): Promise<ProductListingTemplateResponse> {
        const existingProductListingTemplate = await this.getProductListingTemplate(
            productListingTemplateId,
        );

        await this.ensureDepartmentExists(productListingTemplateData.departmentId);
        await this.ensureProductListingTemplateNameIsAvailable(
            productListingTemplateData.name,
            productListingTemplateId,
        );

        const updatedProductListingTemplate = await prisma.productListingTemplate.update({
            where: {
                id: productListingTemplateId,
                deletedAt: null,
            },
            data: productListingTemplateData,
            select: productListingTemplateSelect,
        });

        await createAuditLog({
            entityName: ENTITIES.PRODUCT_LISTING_TEMPLATE,
            entityId: productListingTemplateId,
            action: ACTIONS.UPDATE,
            operationStatus: OperationStatus.SUCCESS,
            dataBefore: existingProductListingTemplate,
            dataAfter: updatedProductListingTemplate,
        });

        return updatedProductListingTemplate;
    }

    static async deleteProductListingTemplate(
        productListingTemplateId: string,
    ): Promise<DeleteProductListingTemplateResponse> {
        const existingProductListingTemplate = await this.getProductListingTemplate(
            productListingTemplateId,
        );

        const assignedProductsCount = await prisma.product.count({
            where: {
                listingTemplateId: productListingTemplateId,
                deletedAt: null,
            },
        });

        if (assignedProductsCount > 0) {
            throw new AppError(
                ErrorNames.CONFLICT,
                409,
                'Product listing template cannot be deleted because it is assigned to a product',
            );
        }

        await prisma.productListingTemplate.update({
            where: {
                id: productListingTemplateId,
                deletedAt: null,
            },
            data: {
                deletedAt: new Date(),
            },
        });

        await createAuditLog({
            entityName: ENTITIES.PRODUCT_LISTING_TEMPLATE,
            entityId: productListingTemplateId,
            action: ACTIONS.DELETE,
            operationStatus: OperationStatus.SUCCESS,
            dataBefore: existingProductListingTemplate,
            dataAfter: null,
        });

        return {
            message: 'Product listing template has been deleted successfully',
        };
    }

    private static async ensureDepartmentExists(departmentId: string) {
        const department = await prisma.department.findFirst({
            where: {
                id: departmentId,
                deletedAt: null,
            },
            select: {
                id: true,
            },
        });

        if (!department) {
            throw new AppError(ErrorNames.RESOURCE_NOT_FOUND, 404, 'Department not found');
        }
    }

    private static async ensureProductListingTemplateNameIsAvailable(
        productListingTemplateName: string,
        excludedProductListingTemplateId?: string,
    ) {
        const existingProductListingTemplate = await prisma.productListingTemplate.findFirst({
            where: {
                id: excludedProductListingTemplateId
                    ? {
                          not: excludedProductListingTemplateId,
                      }
                    : undefined,
                deletedAt: null,
                name: productListingTemplateName,
            },
            select: {
                id: true,
            },
        });

        if (existingProductListingTemplate) {
            throw new AppError(
                ErrorNames.CONFLICT,
                409,
                'Product listing template name is already in use',
            );
        }
    }
}
