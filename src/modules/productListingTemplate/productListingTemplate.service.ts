import { OperationStatus } from '@prisma/client';
import { AppError, ErrorNames } from '../../errors/errorHandler';
import { createAuditLog } from '../../infrastructure/audit/auditLogger';
import { ACTIONS } from '../../shared/constants/actions';
import { ENTITIES } from '../../shared/constants/entities';
import { ProductListingTemplateRepository } from './repositories/productListingTemplateRepository';
import {
    CreateProductListingTemplateDTO,
    UpdateProductListingTemplateDTO,
} from './schemas/productListingTemplate.schema';
import {
    DeleteProductListingTemplateResponse,
    ProductListingTemplateResponse,
} from './types/productListingTemplate.types';

export class ProductListingTemplateService {
    static async getProductListingTemplates(): Promise<ProductListingTemplateResponse[]> {
        return ProductListingTemplateRepository.findAll();
    }

    static async getProductListingTemplate(
        productListingTemplateId: string,
    ): Promise<ProductListingTemplateResponse> {
        const productListingTemplate = await ProductListingTemplateRepository.findById(
            productListingTemplateId,
        );

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

        const createdProductListingTemplate = await ProductListingTemplateRepository.create(
            productListingTemplateData,
        );

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

        const updatedProductListingTemplate = await ProductListingTemplateRepository.update(
            productListingTemplateId,
            productListingTemplateData,
        );

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

        const assignedProductsCount = await ProductListingTemplateRepository.countAssignedProducts(
            productListingTemplateId,
        );

        if (assignedProductsCount > 0) {
            throw new AppError(
                ErrorNames.CONFLICT,
                409,
                'Product listing template cannot be deleted because it is assigned to a product',
            );
        }

        await ProductListingTemplateRepository.softDelete(productListingTemplateId);

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
        const department = await ProductListingTemplateRepository.findActiveDepartment(departmentId);

        if (!department) {
            throw new AppError(ErrorNames.RESOURCE_NOT_FOUND, 404, 'Department not found');
        }
    }

    private static async ensureProductListingTemplateNameIsAvailable(
        productListingTemplateName: string,
        excludedProductListingTemplateId?: string,
    ) {
        const existingProductListingTemplate = await ProductListingTemplateRepository.findByName(
            productListingTemplateName,
            excludedProductListingTemplateId,
        );

        if (existingProductListingTemplate) {
            throw new AppError(
                ErrorNames.CONFLICT,
                409,
                'Product listing template name is already in use',
            );
        }
    }
}
