import { NextFunction, Request, Response } from 'express';
import { parsePaginationQuery } from '../../shared/schema/pagination.schema';
import { PaginatedResponse } from '../../shared/types/pagination.types';
import {
    CarBrandIdParamSchema,
    CarModelIdSchema,
    CreateCarModelSchema,
    UpdateCarModelSchema,
} from './schemas/carModel.schema';
import { CarModelService } from './carModel.service';
import { CarModelResponse, DeleteCarModelResponse } from './types/carModel.types';

export class CarModelController {
    static async getCarModels(
        req: Request,
        res: Response<CarModelResponse[] | PaginatedResponse<CarModelResponse>>,
        next: NextFunction,
    ) {
        try {
            const query = parsePaginationQuery(req.query);
            const result = await CarModelService.getCarModels(query);

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async getCarModel(
        req: Request,
        res: Response<CarModelResponse>,
        next: NextFunction,
    ) {
        try {
            const { id: carModelId } = CarModelIdSchema.parse(req.params);

            const result = await CarModelService.getCarModel(carModelId);

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async getCarModelsByCarBrand(
        req: Request,
        res: Response<CarModelResponse[] | PaginatedResponse<CarModelResponse>>,
        next: NextFunction,
    ) {
        try {
            const { carBrandId } = CarBrandIdParamSchema.parse(req.params);

            const query = parsePaginationQuery(req.query);
            const result = await CarModelService.getCarModelsByCarBrand(carBrandId, query);

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async createCarModel(
        req: Request,
        res: Response<CarModelResponse>,
        next: NextFunction,
    ) {
        try {
            const validatedData = CreateCarModelSchema.parse(req.body);

            const result = await CarModelService.createCarModel(validatedData);

            res.status(201).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async updateCarModel(
        req: Request,
        res: Response<CarModelResponse>,
        next: NextFunction,
    ) {
        try {
            const { id: carModelId } = CarModelIdSchema.parse(req.params);
            const validatedData = UpdateCarModelSchema.parse(req.body);

            const result = await CarModelService.updateCarModel(carModelId, validatedData);

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async deleteCarModel(
        req: Request,
        res: Response<DeleteCarModelResponse>,
        next: NextFunction,
    ) {
        try {
            const { id: carModelId } = CarModelIdSchema.parse(req.params);

            const result = await CarModelService.deleteCarModel(carModelId);

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }
}
