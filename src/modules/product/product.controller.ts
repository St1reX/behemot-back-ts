import { NextFunction, Request, Response } from 'express';
import { ProductService } from './product.service';
import {
    CreateProductRequestSchema,
    ProductIdSchema,
    UpdateProductRequestSchema,
} from './schemas/product.schema';
import { DeleteProductResponse, ProductResponse } from './types/product.types';
import { cleanupFailedImageUpload, parseProductUploads } from './uploads/product.upload';

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
        const uploadedFiles = parseProductUploads(req);

        try {
            const validatedData = CreateProductRequestSchema.parse(req.body);

            const result = await ProductService.createProduct(validatedData, uploadedFiles);

            res.status(201).json(result);
        } catch (error) {
            await cleanupFailedImageUpload(uploadedFiles);
            next(error);
            return;
        }
    }

    static async updateProduct(req: Request, res: Response<ProductResponse>, next: NextFunction) {
        const uploadedFiles = parseProductUploads(req);

        try {
            const { id: productId } = ProductIdSchema.parse(req.params);
            const validatedData = UpdateProductRequestSchema.parse(req.body);

            const result = await ProductService.updateProduct(productId, validatedData, uploadedFiles);

            res.status(200).json(result);
        } catch (error) {
            await cleanupFailedImageUpload(uploadedFiles);
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
