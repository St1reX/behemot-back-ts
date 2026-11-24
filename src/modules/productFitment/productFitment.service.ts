import { OperationStatus } from '@prisma/client';
import { AppError, ErrorNames } from '../../errors/errorHandler';
import { createAuditLog } from '../../infrastructure/audit/auditLogger';
import { ACTIONS } from '../../shared/constants/actions';
import { ENTITIES } from '../../shared/constants/entities';
import { ProductFitmentRepository } from './repositories/productFitmentRepository';
import {
    CreateProductFitmentDTO,
    UpdateProductFitmentDTO,
} from './schemas/productFitment.schema';
import {
    DeleteProductFitmentResponse,
    ProductFitmentResponse,
} from './types/productFitment.types';

export class ProductFitmentService {
    static async getProductFitments(): Promise<ProductFitmentResponse[]> {
        return ProductFitmentRepository.findAll();
    }

    static async getProductFitment(productFitmentId: string): Promise<ProductFitmentResponse> {
        const productFitment = await ProductFitmentRepository.findById(productFitmentId);

        if (!productFitment) {
            throw new AppError(ErrorNames.RESOURCE_NOT_FOUND, 404, 'Nie znaleziono dopasowania produktu do pojazdu.');
        }

        return productFitment;
    }

    static async createProductFitment(
        productFitmentData: CreateProductFitmentDTO,
    ): Promise<ProductFitmentResponse> {
        Object.assign(productFitmentData, (await ProductFitmentRepository.normalizeFitment(productFitmentData))[0]);
        await this.ensureRelationsExist(productFitmentData);
        await this.ensureProductFitmentDataIsAvailable(productFitmentData);

        const createdProductFitment = await ProductFitmentRepository.create(productFitmentData);

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

        Object.assign(productFitmentData, (await ProductFitmentRepository.normalizeFitment(productFitmentData))[0]);
        if (existingProductFitment.product.id !== productFitmentData.productId) {
            throw new AppError(ErrorNames.CONFLICT, 409, 'Nie można przenieść dopasowania do innego produktu.');
        }
        await this.ensureRelationsExist(productFitmentData);
        await this.ensureProductFitmentDataIsAvailable(productFitmentData, productFitmentId);

        const updatedProductFitment = await ProductFitmentRepository.update(
            productFitmentId,
            productFitmentData,
        );

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
                'Nie można usunąć głównego dopasowania produktu do pojazdu.',
            );
        }

        if (await ProductFitmentRepository.countActiveListings(productFitmentId)) {
            throw new AppError(ErrorNames.CONFLICT, 409, 'Dopasowanie jest powiązane z ofertą zewnętrzną.');
        }
        await ProductFitmentRepository.softDelete(productFitmentId);

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
        const product = await ProductFitmentRepository.findActiveProduct(productFitmentData);
        if (!product) {
            throw new AppError(ErrorNames.RESOURCE_NOT_FOUND, 404, 'Nie znaleziono produktu.');
        }
    }

    private static async ensureProductFitmentDataIsAvailable(
        productFitmentData: CreateProductFitmentDTO | UpdateProductFitmentDTO,
        excludedProductFitmentId?: string,
    ) {
        const existingProductFitment = await ProductFitmentRepository.findConflictingFitment(
            productFitmentData,
            excludedProductFitmentId,
        );

        if (!existingProductFitment) {
            return;
        }

        if (existingProductFitment.carGenerationId === productFitmentData.carGenerationId
            && existingProductFitment.carModelId === productFitmentData.carModelId
            && existingProductFitment.carBrandId === productFitmentData.carBrandId) {
            throw new AppError(
                ErrorNames.CONFLICT,
                409,
                'Produkt ma już takie dopasowanie do pojazdu.',
            );
        }

        throw new AppError(
            ErrorNames.CONFLICT,
            409,
            'Produkt ma już główne dopasowanie do pojazdu.',
        );
    }
}
