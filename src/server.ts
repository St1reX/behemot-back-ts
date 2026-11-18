import { createServer } from 'http';
import app, { configureApp } from './app';
import { appWinston } from './config/logger/appWinston';
import { closeBullmqQueues } from './config/bullmq';
import { prisma } from './config/database';
import { apiPort, apiUrl } from './config/env';
import { redisClient } from './config/redis';
import { closeSocketEventEmitter, createSocketServer } from './config/socket';
import { setupGracefulShutdown } from './shared/utils/gracefulShutdown';
import { closeBolmaDatabasePool } from './modules/integrations/bolma/config/database';

async function startServer() {
    await configureApp();

    const httpServer = createServer(app);
    const socketServer = createSocketServer(httpServer);

    httpServer.listen(apiPort, () => {
        appWinston.info(`Server running on port ${apiPort}`);
        appWinston.info(`API address: ${apiUrl}:${apiPort}`);
    });

    setupGracefulShutdown({
        processName: 'API server',
        tasks: [
            { name: 'Socket.IO server', close: socketServer.close },
            { name: 'Socket.IO emitter', close: closeSocketEventEmitter },
            { name: 'BullMQ queues', close: closeBullmqQueues },
            { name: 'session Redis connection', close: () => redisClient.quit() },
            { name: 'Prisma connection', close: () => prisma.$disconnect() },
            { name: 'Bolma MySQL pool', close: closeBolmaDatabasePool },
        ],
    });
}

startServer().catch((error) => {
    appWinston.error('Error while starting server', error);
    process.exitCode = 1;
});
