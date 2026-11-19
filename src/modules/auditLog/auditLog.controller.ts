import { NextFunction, Request, Response } from 'express';
import { AuditLogService } from './auditLog.service';
import { AuditLogIdSchema, AuditLogQuerySchema } from './schemas/auditLog.schema';

export class AuditLogController {
    static async getLogs(req: Request, res: Response, next: NextFunction) {
        try {
            const query = AuditLogQuerySchema.parse(req.query);
            res.setHeader('Cache-Control', 'no-store');
            res.status(200).json(await AuditLogService.getLogs(query));
        } catch (error) { next(error); }
    }

    static async getLog(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = AuditLogIdSchema.parse(req.params);
            res.setHeader('Cache-Control', 'no-store');
            res.status(200).json(await AuditLogService.getLog(id));
        } catch (error) { next(error); }
    }
}
