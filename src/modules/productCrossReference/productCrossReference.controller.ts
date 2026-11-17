import { NextFunction, Request, Response } from 'express';
import { ProductCrossReferenceService } from './productCrossReference.service';
import {
    CreateProductCrossReferenceSchema,
    ProductCrossReferenceIdSchema,
    UpdateProductCrossReferenceSchema,
} from './schemas/productCrossReference.schema';
import {
    DeleteProductCrossReferenceResponse,
    ProductCrossReferenceResponse,
} from './types/productCrossReference.types';

export class ProductCrossReferenceController {
    static async getProductCrossReferences(
        req: Request,
        res: Response<ProductCrossReferenceResponse[]>,
        next: NextFunction,
    ) {
        try {
            const result = await ProductCrossReferenceService.getProductCrossReferences();

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async getProductCrossReference(
        req: Request,
        res: Response<ProductCrossReferenceResponse>,
        next: NextFunction,
    ) {
        try {
            const { id: productCrossReferenceId } = ProductCrossReferenceIdSchema.parse(req.params);

            const result =
                await ProductCrossReferenceService.getProductCrossReference(
                    productCrossReferenceId,
                );

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async createProductCrossReference(
        req: Request,
        res: Response<ProductCrossReferenceResponse>,
        next: NextFunction,
    ) {
        try {
            const validatedData = CreateProductCrossReferenceSchema.parse(req.body);

            const result =
                await ProductCrossReferenceService.createProductCrossReference(validatedData);

            res.status(201).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async updateProductCrossReference(
        req: Request,
        res: Response<ProductCrossReferenceResponse>,
        next: NextFunction,
    ) {
        try {
            const { id: productCrossReferenceId } = ProductCrossReferenceIdSchema.parse(req.params);
            const validatedData = UpdateProductCrossReferenceSchema.parse(req.body);

            const result =
                await ProductCrossReferenceService.updateProductCrossReference(
                    productCrossReferenceId,
                    validatedData,
                );

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async deleteProductCrossReference(
        req: Request,
        res: Response<DeleteProductCrossReferenceResponse>,
        next: NextFunction,
    ) {
        try {
            const { id: productCrossReferenceId } = ProductCrossReferenceIdSchema.parse(req.params);

            const result =
                await ProductCrossReferenceService.deleteProductCrossReference(
                    productCrossReferenceId,
                );

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }
}
