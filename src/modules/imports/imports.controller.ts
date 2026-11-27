import type { NextFunction, Request, Response } from 'express';
import { basename } from 'node:path';
import { ImportsService } from './imports.service';
import { BolmaImportRequestSchema } from './schemas/imports.schema';

function downloadReport(res: Response, next: NextFunction, path: string) {
    res.setHeader('Cache-Control', 'no-store');
    res.download(path, basename(path), (error) => { if (error && !res.headersSent) next(error); });
}

export class ImportsController {
    static async getBolmaStatus(_req: Request, res: Response, next: NextFunction) {
        try {
            const status = await ImportsService.getBolmaStatus();
            res.setHeader('Cache-Control', 'no-store');
            res.status(status.status === 'ok' ? 200 : 503).json(status);
        } catch (error) {
            next(error);
        }
    }

    static getBolmaConfiguration(_req: Request, res: Response) {
        res.setHeader('Cache-Control', 'no-store');
        res.json(ImportsService.getBolmaConfiguration());
    }

    static async importBolmaProducts(req: Request, res: Response, next: NextFunction) {
        let disconnected = false;
        const onClose = () => { disconnected = true; };
        res.on('close', onClose);
        res.setTimeout(0);
        try {
            BolmaImportRequestSchema.parse(req.body);
            const path = await ImportsService.importBolmaProducts(req.user!.id, () => disconnected);
            if (!disconnected) downloadReport(res, next, path);
        } catch (error) {
            if (!disconnected) next(error);
        } finally {
            res.off('close', onClose);
        }
    }

    static async downloadLatestBolmaReport(req: Request, res: Response, next: NextFunction) {
        try {
            const path = await ImportsService.getLatestBolmaReport();
            downloadReport(res, next, path);
        } catch (error) {
            next(error);
        }
    }
}
