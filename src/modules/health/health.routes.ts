import { Router } from 'express';
import { HealthRepository } from './repositories/healthRepository';
import { redisClient } from '../../config/redis';

const router = Router();

router.get('/live', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

router.get('/ready', async (req, res) => {
    const results: Record<string, string> = {};

    try {
        await HealthRepository.checkDatabaseConnection();
        results['database'] = 'ok';
    } catch {
        results['database'] = 'error';
    }

    try {
        const pong = await redisClient.ping();
        results['redis'] = pong === 'PONG' ? 'ok' : 'error';
    } catch {
        results['redis'] = 'error';
    }

    const hasError = Object.values(results).some((v) => v === 'error');

    res.status(hasError ? 500 : 200).json({
        status: hasError ? 'error' : 'ok',
        components: results,
    });
});

export default router;
