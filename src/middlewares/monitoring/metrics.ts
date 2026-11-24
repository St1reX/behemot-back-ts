import { NextFunction, Request, Response } from 'express';
import client from 'prom-client';

export const metricsRegister = new client.Registry();

client.collectDefaultMetrics({
    register: metricsRegister,
    prefix: 'app_',
});

const httpRequestDuration = new client.Histogram({
    name: 'app_http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});

metricsRegister.registerMetric(httpRequestDuration);

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
    const end = httpRequestDuration.startTimer();

    res.on('finish', () => {
        end({
            method: req.method,
            route: req.route?.path || req.path,
            status_code: res.statusCode.toString(),
        });
    });

    next();
}

export async function metricsHandler(_req: Request, res: Response) {
    res.setHeader('Content-Type', metricsRegister.contentType);
    res.end(await metricsRegister.metrics());
}
