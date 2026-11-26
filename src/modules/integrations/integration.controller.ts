import { NextFunction, Request, Response } from 'express';
import { IntegrationService } from './integration.service';
import { MarketplaceIntegrationService } from './marketplace/marketplaceIntegration.service';
import { MarketplaceChannelParamsSchema } from './marketplace/schemas/marketplaceIntegration.schema';

export class IntegrationController {
    static async createMarketplaceIntegration(
        req: Request,
        res: Response<Awaited<ReturnType<typeof MarketplaceIntegrationService.createIntegration>>>,
        next: NextFunction,
    ) {
        try {
            const { channel } = MarketplaceChannelParamsSchema.parse(req.params);
            const integration = await MarketplaceIntegrationService.createIntegration(channel, req.body);
            res.setHeader('Cache-Control', 'no-store');
            res.status(201).json(integration);
        } catch (error) {
            next(error);
        }
    }

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
