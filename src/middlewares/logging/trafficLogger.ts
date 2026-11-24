import { NextFunction, Request, Response } from 'express';
import { trafficWinston } from '../../config/logger/trafficWinston';

export function trafficLogger(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();

    res.on('finish', () => {
        const durationMs = Date.now() - start;
        const durationSeconds = durationMs / 1000;

        trafficWinston.info({
            timestamp: new Date().toISOString(),
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            responseTimeSeconds: durationSeconds,
            ip: req.ip,
            userId: req.user?.id,
            requestId: req.id,
            userAgent: req.headers['user-agent'],
        });
    });

    next();
}
