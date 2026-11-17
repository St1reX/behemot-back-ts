import { NextFunction, Request, Response } from 'express';
import {
    CreateProducerSchema,
    ProducerIdSchema,
    UpdateProducerSchema,
} from './schemas/producer.schema';
import { ProducerService } from './producer.service';
import { DeleteProducerResponse, ProducerResponse } from './types/producer.types';

export class ProducerController {
    static async getProducers(
        req: Request,
        res: Response<ProducerResponse[]>,
        next: NextFunction,
    ) {
        try {
            const result = await ProducerService.getProducers();

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async getProducer(
        req: Request,
        res: Response<ProducerResponse>,
        next: NextFunction,
    ) {
        try {
            const { id: producerId } = ProducerIdSchema.parse(req.params);

            const result = await ProducerService.getProducer(producerId);

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async createProducer(
        req: Request,
        res: Response<ProducerResponse>,
        next: NextFunction,
    ) {
        try {
            const validatedData = CreateProducerSchema.parse(req.body);

            const result = await ProducerService.createProducer(validatedData);

            res.status(201).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async updateProducer(
        req: Request,
        res: Response<ProducerResponse>,
        next: NextFunction,
    ) {
        try {
            const { id: producerId } = ProducerIdSchema.parse(req.params);
            const validatedData = UpdateProducerSchema.parse(req.body);

            const result = await ProducerService.updateProducer(producerId, validatedData);

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async deleteProducer(
        req: Request,
        res: Response<DeleteProducerResponse>,
        next: NextFunction,
    ) {
        try {
            const { id: producerId } = ProducerIdSchema.parse(req.params);

            const result = await ProducerService.deleteProducer(producerId);

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }
}
