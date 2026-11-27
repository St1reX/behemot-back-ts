import { NextFunction, Request, Response } from 'express';
import { BolmaService } from './bolma.service';
import { BolmaConfiguration, BolmaStatusResponse } from './types/bolma.types';

export class BolmaController {
    static getConfiguration(req: Request, res: Response<BolmaConfiguration>, next: NextFunction) {
        try {
            res.setHeader('Cache-Control', 'no-store');
            res.status(200).json(BolmaService.getConfiguration());
        } catch (error) {
            next(error);
        }
    }

    static async getStatus(
        req: Request,
        res: Response<BolmaStatusResponse>,
        next: NextFunction,
    ) {
        try {
            const result = await BolmaService.getStatus();

            res.setHeader('Cache-Control', 'no-store');
            res.status(result.status === 'ok' ? 200 : 503).json(result);
        } catch (error) {
            next(error);
        }
    }
}
