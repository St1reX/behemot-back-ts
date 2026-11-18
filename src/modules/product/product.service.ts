import { OperationStatus } from '@prisma/client';
import { AppError, ErrorNames } from '../../errors/errorHandler';
import { createAuditLog } from '../../infrastructure/audit/auditLogger';
import { ACTIONS } from '../../shared/constants/actions';
import { ENTITIES } from '../../shared/constants/entities';
import { enqueueProductListingSync } from './jobs/listingSync/productListingSync.queue';
import { mapProductResponse } from './mappers/productMapper';
import { ProductRepository } from './repositories/productRepository';
import { CreateProductDTO, UpdateProductDTO } from './schemas/product.schema';
import { DeleteProductResponse, ProductResponse } from './types/product.types';

export class ProductService {
    static async getProducts(): Promise<ProductResponse[]> {
        const products = await ProductRepository.findAll();

        return products.map((product) => mapProductResponse(product));
    }

    static async getProduct(productId: string): Promise<ProductResponse> {
        const product = await ProductRepository.findById(productId);

        if (!product) {
            throw new AppError(ErrorNames.RESOURCE_NOT_FOUND, 404, 'Nie znaleziono produktu.');
        }

        return mapProductResponse(product);
    }

    static async createProduct(productData: CreateProductDTO): Promise<ProductResponse> {
        await this.ensureProductRelationsExist(productData);
        await this.ensureProductDataIsAvailable(productData);

        const createdProduct = await ProductRepository.create(productData);
        const createdProductResponse = mapProductResponse(createdProduct);

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

        const updatedProduct = await ProductRepository.update(productId, productData);
        const updatedProductResponse = mapProductResponse(updatedProduct);

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

        await ProductRepository.softDeleteWithRelations(productId, deletedAt);

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
            ProductRepository.findActiveWarehouse(productData),
            ProductRepository.findActiveListingTemplate(productData),
            ProductRepository.findActiveDepartment(productData),
            ProductRepository.findActiveProducer(productData),
        ]);

        if (!warehouse) {
            throw new AppError(ErrorNames.RESOURCE_NOT_FOUND, 404, 'Nie znaleziono magazynu.');
        }

        if (!department) {
            throw new AppError(ErrorNames.RESOURCE_NOT_FOUND, 404, 'Nie znaleziono działu.');
        }

        if (!listingTemplate) {
            throw new AppError(
                ErrorNames.RESOURCE_NOT_FOUND,
                404,
                'Nie znaleziono szablonu oferty dla wybranego działu.',
            );
        }

        if (!producer) {
            throw new AppError(ErrorNames.RESOURCE_NOT_FOUND, 404, 'Nie znaleziono producenta.');
        }
    }

    private static async ensureProductDataIsAvailable(
        productData: CreateProductDTO | UpdateProductDTO,
        excludedProductId?: string,
    ) {
        const existingProduct = await ProductRepository.findConflictingProduct(productData, excludedProductId);

        if (existingProduct) {
            throw new AppError(ErrorNames.CONFLICT, 409, 'Numer SKU lub EAN produktu jest już zajęty.');
        }
    }
}
