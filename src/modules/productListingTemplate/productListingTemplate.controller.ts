import { NextFunction, Request, Response } from 'express';
import {
    CreateProductListingTemplateSchema,
    ProductListingTemplateIdSchema,
    UpdateProductListingTemplateSchema,
    PreviewProductListingTemplateSchema,
} from './schemas/productListingTemplate.schema';
import { ProductListingTemplateService } from './productListingTemplate.service';
import {
    DeleteProductListingTemplateResponse,
    ProductListingTemplateResponse,
    ProductListingPlaceholderResponse,
    ProductListingTemplatePreviewResponse,
} from './types/productListingTemplate.types';

export class ProductListingTemplateController {
    static getPlaceholders(_req: Request, res: Response<ProductListingPlaceholderResponse[]>, next: NextFunction) {
        try {
            res.status(200).json(ProductListingTemplateService.getPlaceholders());
        } catch (error) {
            next(error);
        }
    }

    static preview(req: Request, res: Response<ProductListingTemplatePreviewResponse>, next: NextFunction) {
        try {
            const data = PreviewProductListingTemplateSchema.parse(req.body);
            res.status(200).json(ProductListingTemplateService.preview(data));
        } catch (error) {
            next(error);
        }
    }

    static async getProductListingTemplates(
        req: Request,
        res: Response<ProductListingTemplateResponse[]>,
        next: NextFunction,
    ) {
        try {
            const result = await ProductListingTemplateService.getProductListingTemplates();

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async getProductListingTemplate(
        req: Request,
        res: Response<ProductListingTemplateResponse>,
        next: NextFunction,
    ) {
        try {
            const { id: productListingTemplateId } = ProductListingTemplateIdSchema.parse(
                req.params,
            );

            const result =
                await ProductListingTemplateService.getProductListingTemplate(
                    productListingTemplateId,
                );

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async createProductListingTemplate(
        req: Request,
        res: Response<ProductListingTemplateResponse>,
        next: NextFunction,
    ) {
        try {
            const validatedData = CreateProductListingTemplateSchema.parse(req.body);

            const result =
                await ProductListingTemplateService.createProductListingTemplate(validatedData);

            res.status(201).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async updateProductListingTemplate(
        req: Request,
        res: Response<ProductListingTemplateResponse>,
        next: NextFunction,
    ) {
        try {
            const { id: productListingTemplateId } = ProductListingTemplateIdSchema.parse(
                req.params,
            );
            const validatedData = UpdateProductListingTemplateSchema.parse(req.body);

            const result =
                await ProductListingTemplateService.updateProductListingTemplate(
                    productListingTemplateId,
                    validatedData,
                );

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async deleteProductListingTemplate(
        req: Request,
        res: Response<DeleteProductListingTemplateResponse>,
        next: NextFunction,
    ) {
        try {
            const { id: productListingTemplateId } = ProductListingTemplateIdSchema.parse(
                req.params,
            );

            const result =
                await ProductListingTemplateService.deleteProductListingTemplate(
                    productListingTemplateId,
                );

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }
}
