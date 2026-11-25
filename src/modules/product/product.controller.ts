import { toUploadPublicUrl } from '../../config/multer';
import { AppError, ErrorNames } from '../../errors/errorHandler';
import { getProductUploadedFiles, storeProductImages } from './uploads/product.upload';
import { PRODUCT_UPLOAD_DATA_FIELD } from './constants/productUploads';
import { NextFunction, Request, Response } from 'express';
import { ProductService } from './product.service';
import {
    CreateProductSchema,
    ProductIdSchema,
    UpdateProductSchema,
} from './schemas/product.schema';
import { DeleteProductResponse, ProductResponse } from './types/product.types';

function productRequestBody(req: Request): unknown {
    if (!req.is('multipart/form-data')) return req.body;
    try {
        if (typeof req.body?.[PRODUCT_UPLOAD_DATA_FIELD] !== 'string') throw new Error('Missing product data');
        return JSON.parse(req.body[PRODUCT_UPLOAD_DATA_FIELD]);
    } catch {
        throw new AppError(ErrorNames.VALIDATION_ERROR, 422, 'Pole data musi zawierać poprawny obiekt JSON produktu.');
    }
}

export class ProductController {
    static async getProducts(req: Request, res: Response<ProductResponse[]>, next: NextFunction) {
        try {
            const result = await ProductService.getProducts();

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async getProduct(req: Request, res: Response<ProductResponse>, next: NextFunction) {
        try {
            const { id: productId } = ProductIdSchema.parse(req.params);

            const result = await ProductService.getProduct(productId);

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async createProduct(req: Request, res: Response<ProductResponse>, next: NextFunction) {
        try {
            const validatedData = CreateProductSchema.parse(productRequestBody(req));
            const uploaded = await storeProductImages(getProductUploadedFiles(req), validatedData.sku);
            validatedData.imagesUrls.push(...uploaded.imagesUrls);
            validatedData.descriptionImagesUrls.push(...uploaded.descriptionImagesUrls);

            const result = await ProductService.createProduct(validatedData);

            res.status(201).json(result);
        } catch (error) {
            await ProductService.cleanupFailedImageUpload(getProductUploadedFiles(req).map((file) => ({
                path: file.path,
                url: toUploadPublicUrl(file.path),
            })));
            next(error);
            return;
        }
    }

    static async updateProduct(req: Request, res: Response<ProductResponse>, next: NextFunction) {
        try {
            const { id: productId } = ProductIdSchema.parse(req.params);
            const validatedData = UpdateProductSchema.parse(productRequestBody(req));
            const uploaded = await storeProductImages(getProductUploadedFiles(req), validatedData.sku);
            validatedData.imagesUrls.push(...uploaded.imagesUrls);
            validatedData.descriptionImagesUrls.push(...uploaded.descriptionImagesUrls);

            const result = await ProductService.updateProduct(productId, validatedData);

            res.status(200).json(result);
        } catch (error) {
            await ProductService.cleanupFailedImageUpload(getProductUploadedFiles(req).map((file) => ({
                path: file.path,
                url: toUploadPublicUrl(file.path),
            })));
            next(error);
            return;
        }
    }

    static async deleteProduct(
        req: Request,
        res: Response<DeleteProductResponse>,
        next: NextFunction,
    ) {
        try {
            const { id: productId } = ProductIdSchema.parse(req.params);

            const result = await ProductService.deleteProduct(productId);

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }
}
