import { NextFunction, Request, Response } from 'express';
import { ProductService } from './product.service';
import {
    CreateProductSchema,
    ProductIdSchema,
    UpdateProductSchema,
} from './schemas/product.schema';
import { DeleteProductResponse, ProductResponse } from './types/product.types';

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
            const validatedData = CreateProductSchema.parse(req.body);

            const result = await ProductService.createProduct(validatedData);

            res.status(201).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async updateProduct(req: Request, res: Response<ProductResponse>, next: NextFunction) {
        try {
            const { id: productId } = ProductIdSchema.parse(req.params);
            const validatedData = UpdateProductSchema.parse(req.body);

            const result = await ProductService.updateProduct(productId, validatedData);

            res.status(200).json(result);
        } catch (error) {
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
