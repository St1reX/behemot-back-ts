import { NextFunction, Request, Response } from 'express';
import {
    ContractorIdSchema,
    CreateContractorSchema,
    UpdateContractorSchema,
} from './schemas/contractor.schema';
import { ContractorService } from './contractor.service';
import { ContractorResponse, DeleteContractorResponse } from './types/contractor.types';

export class ContractorController {
    static async getContractors(
        req: Request,
        res: Response<ContractorResponse[]>,
        next: NextFunction,
    ) {
        try {
            const result = await ContractorService.getContractors();

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async getContractor(
        req: Request,
        res: Response<ContractorResponse>,
        next: NextFunction,
    ) {
        try {
            const { id: contractorId } = ContractorIdSchema.parse(req.params);

            const result = await ContractorService.getContractor(contractorId);

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async createContractor(
        req: Request,
        res: Response<ContractorResponse>,
        next: NextFunction,
    ) {
        try {
            const validatedData = CreateContractorSchema.parse(req.body);

            const result = await ContractorService.createContractor(validatedData);

            res.status(201).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async updateContractor(
        req: Request,
        res: Response<ContractorResponse>,
        next: NextFunction,
    ) {
        try {
            const { id: contractorId } = ContractorIdSchema.parse(req.params);
            const validatedData = UpdateContractorSchema.parse(req.body);

            const result = await ContractorService.updateContractor(contractorId, validatedData);

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async deleteContractor(
        req: Request,
        res: Response<DeleteContractorResponse>,
        next: NextFunction,
    ) {
        try {
            const { id: contractorId } = ContractorIdSchema.parse(req.params);

            const result = await ContractorService.deleteContractor(contractorId);

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }
}
