import { NextFunction, Request, Response } from 'express';
import { ProductFitmentService } from './productFitment.service';
import {
    CreateProductFitmentSchema,
    ProductFitmentIdSchema,
    UpdateProductFitmentSchema,
} from './schemas/productFitment.schema';
import {
    DeleteProductFitmentResponse,
    ProductFitmentResponse,
} from './types/productFitment.types';

export class ProductFitmentController {
    static async getProductFitments(
        req: Request,
        res: Response<ProductFitmentResponse[]>,
        next: NextFunction,
    ) {
        try {
            const result = await ProductFitmentService.getProductFitments();

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async getProductFitment(
        req: Request,
        res: Response<ProductFitmentResponse>,
        next: NextFunction,
    ) {
        try {
            const { id: productFitmentId } = ProductFitmentIdSchema.parse(req.params);

            const result = await ProductFitmentService.getProductFitment(productFitmentId);

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async createProductFitment(
        req: Request,
        res: Response<ProductFitmentResponse>,
        next: NextFunction,
    ) {
        try {
            const validatedData = CreateProductFitmentSchema.parse(req.body);

            const result = await ProductFitmentService.createProductFitment(validatedData);

            res.status(201).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async updateProductFitment(
        req: Request,
        res: Response<ProductFitmentResponse>,
        next: NextFunction,
    ) {
        try {
            const { id: productFitmentId } = ProductFitmentIdSchema.parse(req.params);
            const validatedData = UpdateProductFitmentSchema.parse(req.body);

            const result = await ProductFitmentService.updateProductFitment(
                productFitmentId,
                validatedData,
            );

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async deleteProductFitment(
        req: Request,
        res: Response<DeleteProductFitmentResponse>,
        next: NextFunction,
    ) {
        try {
            const { id: productFitmentId } = ProductFitmentIdSchema.parse(req.params);

            const result = await ProductFitmentService.deleteProductFitment(productFitmentId);

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }
}
