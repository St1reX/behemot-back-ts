import { createAdapter } from '@socket.io/redis-adapter';
import { Emitter } from '@socket.io/redis-emitter';
import { IncomingMessage, Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { appWinston } from './logger/appWinston';
import passport from './passport';
import { redisClient } from './redis';
import { frontendUrl } from './env';
import { sessionMiddleware } from '../middlewares/auth/sessionMiddleware';
import { ProductServerToClientEvents } from '../modules/product/events/product.events';

interface ClientToServerEvents {}

type AuthenticatedSocketRequest = IncomingMessage & {
    user?: Express.User;
};

type SocketRedisEmitterResource = ReturnType<typeof createSocketEventEmitter>;

export const SOCKET_REDIS_KEY = 'behemot-socket.io';

let socketRedisEmitterResource: SocketRedisEmitterResource | null = null;

export function getUserSocketRoom(userId: string) {
    return `user:${userId}`;
}

export function createSocketEventEmitter() {
    const socketRedisEmitterClient = redisClient.duplicate();

    socketRedisEmitterClient.on('error', (error) => {
        appWinston.error(`Socket.IO Redis emitter error: ${error.message}`);
    });

    return {
        emitter: new Emitter<ProductServerToClientEvents>(socketRedisEmitterClient, {
            key: SOCKET_REDIS_KEY,
        }),
        redisClient: socketRedisEmitterClient,
    };
}

export function getSocketEventEmitter() {
    socketRedisEmitterResource ??= createSocketEventEmitter();

    return socketRedisEmitterResource.emitter;
}

export async function closeSocketEventEmitter() {
    if (!socketRedisEmitterResource) {
        return;
    }

    await socketRedisEmitterResource.redisClient.quit();
    socketRedisEmitterResource = null;
}

export function createSocketServer(httpServer: HttpServer) {
    const socketRedisPublisher = redisClient.duplicate();
    const socketRedisSubscriber = redisClient.duplicate();

    socketRedisPublisher.on('error', (error) => {
        appWinston.error(`Socket.IO Redis publisher error: ${error.message}`);
    });
    socketRedisSubscriber.on('error', (error) => {
        appWinston.error(`Socket.IO Redis subscriber error: ${error.message}`);
    });

    const io = new SocketServer<ClientToServerEvents, ProductServerToClientEvents>(httpServer, {
        cors: {
            origin: frontendUrl,
            credentials: true,
        },
    });

    io.adapter(
        createAdapter(socketRedisPublisher, socketRedisSubscriber, {
            key: SOCKET_REDIS_KEY,
        }),
    );

    io.engine.use(sessionMiddleware);
    io.engine.use(passport.initialize());
    io.engine.use(passport.session());

    io.use((socket, next) => {
        const request = socket.request as AuthenticatedSocketRequest;

        if (!request.user) {
            next(new Error('Unauthorized'));
            return;
        }

        next();
    });

    io.on('connection', (socket) => {
        const request = socket.request as AuthenticatedSocketRequest;

        if (request.user) {
            void socket.join(getUserSocketRoom(request.user.id));
        }
    });

    return {
        io,
        async close() {
            await new Promise<void>((resolve) => {
                io.close(() => resolve());
            });
            await Promise.all([socketRedisPublisher.quit(), socketRedisSubscriber.quit()]);
        },
    };
}
