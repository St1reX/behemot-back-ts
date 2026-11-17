import { NextFunction, Request, Response } from 'express';
import {
    CreateWarehouseSchema,
    UpdateWarehouseSchema,
    WarehouseIdSchema,
} from './schemas/warehouse.schema';
import { DeleteWarehouseResponse, WarehouseResponse } from './types/warehouse.types';
import { WarehouseService } from './warehouse.service';

export class WarehouseController {
    static async getWarehouses(
        req: Request,
        res: Response<WarehouseResponse[]>,
        next: NextFunction,
    ) {
        try {
            const result = await WarehouseService.getWarehouses();

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async getWarehouse(
        req: Request,
        res: Response<WarehouseResponse>,
        next: NextFunction,
    ) {
        try {
            const { id: warehouseId } = WarehouseIdSchema.parse(req.params);

            const result = await WarehouseService.getWarehouse(warehouseId);

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async createWarehouse(
        req: Request,
        res: Response<WarehouseResponse>,
        next: NextFunction,
    ) {
        try {
            const validatedData = CreateWarehouseSchema.parse(req.body);

            const result = await WarehouseService.createWarehouse(validatedData);

            res.status(201).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async updateWarehouse(
        req: Request,
        res: Response<WarehouseResponse>,
        next: NextFunction,
    ) {
        try {
            const { id: warehouseId } = WarehouseIdSchema.parse(req.params);
            const validatedData = UpdateWarehouseSchema.parse(req.body);

            const result = await WarehouseService.updateWarehouse(warehouseId, validatedData);

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async deleteWarehouse(
        req: Request,
        res: Response<DeleteWarehouseResponse>,
        next: NextFunction,
    ) {
        try {
            const { id: warehouseId } = WarehouseIdSchema.parse(req.params);

            const result = await WarehouseService.deleteWarehouse(warehouseId);

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }
}
