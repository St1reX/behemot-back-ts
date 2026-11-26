import { NextFunction, Request, Response } from 'express';
import { IntegrationService } from './integration.service';
import { MarketplaceIntegrationService } from './marketplace/marketplaceIntegration.service';
import { MarketplaceChannelParamsSchema } from './marketplace/schemas/marketplaceIntegration.schema';
import { IdParamsSchema } from '../../shared/schema/commonSchema';

export class IntegrationController {
    static async checkMarketplaceConnection(
        req: Request,
        res: Response<Awaited<ReturnType<typeof MarketplaceIntegrationService.checkConnection>>>,
        next: NextFunction,
    ) {
        try {
            const { id } = IdParamsSchema.parse(req.params);
            const result = await MarketplaceIntegrationService.checkConnection(id);
            res.setHeader('Cache-Control', 'no-store');
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    static async deleteMarketplaceIntegration(
        req: Request,
        res: Response<Awaited<ReturnType<typeof MarketplaceIntegrationService.deleteIntegration>>>,
        next: NextFunction,
    ) {
        try {
            const { id } = IdParamsSchema.parse(req.params);
            const result = await MarketplaceIntegrationService.deleteIntegration(id);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    static async createMarketplaceIntegration(
        req: Request,
        res: Response<Awaited<ReturnType<typeof MarketplaceIntegrationService.createIntegration>>>,
        next: NextFunction,
    ) {
        try {
            const { channel } = MarketplaceChannelParamsSchema.parse(req.params);
            res.setHeader('Cache-Control', 'no-store');
            const integration = await MarketplaceIntegrationService.createIntegration(channel, req.body);
            res.status('results' in integration ? 200 : 201).json(integration);
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
