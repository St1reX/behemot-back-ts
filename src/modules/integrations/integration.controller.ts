import { NextFunction, Request, Response } from 'express';
import { IntegrationService } from './integration.service';

export class IntegrationController {
    static async getIntegrations(
        req: Request,
        res: Response<Awaited<ReturnType<typeof IntegrationService.getIntegrations>>>,
        next: NextFunction,
    ) {
        try {
            const result = await IntegrationService.getIntegrations();
            res.setHeader('Cache-Control', 'no-store');
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }
}
