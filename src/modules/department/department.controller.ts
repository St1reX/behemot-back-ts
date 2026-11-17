import { NextFunction, Request, Response } from 'express';
import {
    CreateDepartmentSchema,
    DepartmentIdSchema,
    UpdateDepartmentSchema,
} from './schemas/department.schema';
import { DepartmentService } from './department.service';
import {
    DeleteDepartmentResponse,
    DepartmentResponse,
} from './types/department.types';

export class DepartmentController {
    static async getDepartments(
        req: Request,
        res: Response<DepartmentResponse[]>,
        next: NextFunction,
    ) {
        try {
            const result = await DepartmentService.getDepartments();

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async getDepartment(
        req: Request,
        res: Response<DepartmentResponse>,
        next: NextFunction,
    ) {
        try {
            const { id: departmentId } = DepartmentIdSchema.parse(req.params);

            const result = await DepartmentService.getDepartment(departmentId);

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async createDepartment(
        req: Request,
        res: Response<DepartmentResponse>,
        next: NextFunction,
    ) {
        try {
            const validatedData = CreateDepartmentSchema.parse(req.body);

            const result = await DepartmentService.createDepartment(validatedData);

            res.status(201).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async updateDepartment(
        req: Request,
        res: Response<DepartmentResponse>,
        next: NextFunction,
    ) {
        try {
            const { id: departmentId } = DepartmentIdSchema.parse(req.params);
            const validatedData = UpdateDepartmentSchema.parse(req.body);

            const result = await DepartmentService.updateDepartment(
                departmentId,
                validatedData,
            );

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async deleteDepartment(
        req: Request,
        res: Response<DeleteDepartmentResponse>,
        next: NextFunction,
    ) {
        try {
            const { id: departmentId } = DepartmentIdSchema.parse(req.params);

            const result = await DepartmentService.deleteDepartment(departmentId);

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }
}
