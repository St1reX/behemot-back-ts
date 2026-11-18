import { OperationStatus } from '@prisma/client';
import { AppError, ErrorNames } from '../../errors/errorHandler';
import { createAuditLog } from '../../infrastructure/audit/auditLogger';
import { ACTIONS } from '../../shared/constants/actions';
import { ENTITIES } from '../../shared/constants/entities';
import { ProductCrossReferenceRepository } from './repositories/productCrossReferenceRepository';
import {
    CreateProductCrossReferenceDTO,
    UpdateProductCrossReferenceDTO,
} from './schemas/productCrossReference.schema';
import {
    DeleteProductCrossReferenceResponse,
    ProductCrossReferenceResponse,
} from './types/productCrossReference.types';

export class ProductCrossReferenceService {
    static async getProductCrossReferences(): Promise<ProductCrossReferenceResponse[]> {
        return ProductCrossReferenceRepository.findAll();
    }

    static async getProductCrossReference(
        productCrossReferenceId: string,
    ): Promise<ProductCrossReferenceResponse> {
        const productCrossReference = await ProductCrossReferenceRepository.findById(productCrossReferenceId);

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

        const createdProductCrossReference = await ProductCrossReferenceRepository.create(
            productCrossReferenceData,
        );

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

        const updatedProductCrossReference = await ProductCrossReferenceRepository.update(
            productCrossReferenceId,
            productCrossReferenceData,
        );

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

        await ProductCrossReferenceRepository.softDelete(productCrossReferenceId);

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
            ProductCrossReferenceRepository.findActiveProduct(productCrossReferenceData),
            ProductCrossReferenceRepository.findActiveContractor(productCrossReferenceData),
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
        const existingProductCrossReference = await ProductCrossReferenceRepository.findConflictingCrossReference(
            productCrossReferenceData,
            excludedProductCrossReferenceId,
        );

        if (existingProductCrossReference) {
            throw new AppError(
                ErrorNames.CONFLICT,
                409,
                'Product cross reference data is already in use',
            );
        }
    }
}
