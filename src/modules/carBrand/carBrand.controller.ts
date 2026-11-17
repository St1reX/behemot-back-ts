import { NextFunction, Request, Response } from 'express';
import {
    CarBrandIdSchema,
    CreateCarBrandSchema,
    UpdateCarBrandSchema,
} from './schemas/carBrand.schema';
import { CarBrandService } from './carBrand.service';
import { CarBrandResponse, DeleteCarBrandResponse } from './types/carBrand.types';

export class CarBrandController {
    static async getCarBrands(
        req: Request,
        res: Response<CarBrandResponse[]>,
        next: NextFunction,
    ) {
        try {
            const result = await CarBrandService.getCarBrands();

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async getCarBrand(
        req: Request,
        res: Response<CarBrandResponse>,
        next: NextFunction,
    ) {
        try {
            const { id: carBrandId } = CarBrandIdSchema.parse(req.params);

            const result = await CarBrandService.getCarBrand(carBrandId);

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async createCarBrand(
        req: Request,
        res: Response<CarBrandResponse>,
        next: NextFunction,
    ) {
        try {
            const validatedData = CreateCarBrandSchema.parse(req.body);

            const result = await CarBrandService.createCarBrand(validatedData);

            res.status(201).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async updateCarBrand(
        req: Request,
        res: Response<CarBrandResponse>,
        next: NextFunction,
    ) {
        try {
            const { id: carBrandId } = CarBrandIdSchema.parse(req.params);
            const validatedData = UpdateCarBrandSchema.parse(req.body);

            const result = await CarBrandService.updateCarBrand(carBrandId, validatedData);

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async deleteCarBrand(
        req: Request,
        res: Response<DeleteCarBrandResponse>,
        next: NextFunction,
    ) {
        try {
            const { id: carBrandId } = CarBrandIdSchema.parse(req.params);

            const result = await CarBrandService.deleteCarBrand(carBrandId);

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }
}
