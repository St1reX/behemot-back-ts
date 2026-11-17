import { NextFunction, Request, Response } from 'express';
import {
    CarGenerationIdSchema,
    CarModelIdParamSchema,
    CreateCarGenerationSchema,
    UpdateCarGenerationSchema,
} from './schemas/carGeneration.schema';
import { CarGenerationService } from './carGeneration.service';
import {
    CarGenerationResponse,
    DeleteCarGenerationResponse,
} from './types/carGeneration.types';

export class CarGenerationController {
    static async getCarGenerations(
        req: Request,
        res: Response<CarGenerationResponse[]>,
        next: NextFunction,
    ) {
        try {
            const result = await CarGenerationService.getCarGenerations();

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async getCarGeneration(
        req: Request,
        res: Response<CarGenerationResponse>,
        next: NextFunction,
    ) {
        try {
            const { id: carGenerationId } = CarGenerationIdSchema.parse(req.params);

            const result = await CarGenerationService.getCarGeneration(carGenerationId);

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async getCarGenerationsByCarModel(
        req: Request,
        res: Response<CarGenerationResponse[]>,
        next: NextFunction,
    ) {
        try {
            const { carModelId } = CarModelIdParamSchema.parse(req.params);

            const result = await CarGenerationService.getCarGenerationsByCarModel(carModelId);

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async createCarGeneration(
        req: Request,
        res: Response<CarGenerationResponse>,
        next: NextFunction,
    ) {
        try {
            const validatedData = CreateCarGenerationSchema.parse(req.body);

            const result = await CarGenerationService.createCarGeneration(validatedData);

            res.status(201).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async updateCarGeneration(
        req: Request,
        res: Response<CarGenerationResponse>,
        next: NextFunction,
    ) {
        try {
            const { id: carGenerationId } = CarGenerationIdSchema.parse(req.params);
            const validatedData = UpdateCarGenerationSchema.parse(req.body);

            const result = await CarGenerationService.updateCarGeneration(
                carGenerationId,
                validatedData,
            );

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async deleteCarGeneration(
        req: Request,
        res: Response<DeleteCarGenerationResponse>,
        next: NextFunction,
    ) {
        try {
            const { id: carGenerationId } = CarGenerationIdSchema.parse(req.params);

            const result = await CarGenerationService.deleteCarGeneration(carGenerationId);

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }
}
