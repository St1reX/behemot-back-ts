import './config/zod';
import express from 'express';
import cors from 'cors';
import { appWinston } from './config/logger/appWinston';
import { notFound, errorHandler } from './errors/errorHandler';
import passport from './config/passport';
import { sessionMiddleware } from './middlewares/auth/sessionMiddleware';
import { limiter } from './middlewares/security/rateLimiter';
import { requestId } from './middlewares/context/requestId';
import { trafficLogger } from './middlewares/logging/trafficLogger';
import { helmetConfig } from './middlewares/security/helmet';
import { loadRoutes } from './shared/utils/loadRoutes';
import { frontendUrl, isDevelopment } from './config/env';
import swaggerUi from 'swagger-ui-express';
import swaggerFile from './swagger/swagger_output.json';
import { attachUserToRequestContext } from './middlewares/context/attachUserToRequestContext';
import { metricsMiddleware, metricsHandler } from './middlewares/monitoring/metrics';

import { uploadsPublicPath, uploadsStaticMiddleware } from './config/multer';

const app = express();

//PROMETHEUS metrics
app.use(metricsMiddleware);

// Request identification middleware - adds unique ID to each request
app.use(requestId);

// Trust proxy configuration for production environments
if (!isDevelopment) {
    app.set('trust proxy', 1);
}

// CORS configuration - handles cross-origin requests
app.use(
    cors({
        origin: frontendUrl,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        credentials: true,
        exposedHeaders: ['Content-Disposition'],
        preflightContinue: false,
        optionsSuccessStatus: 200,
    }),
);

// Rate limiting follows CORS so browsers can read error responses.
app.use(limiter);

// Security middleware - adds various HTTP headers for security
app.use(helmetConfig);

// Body parsing middleware - handles JSON and URL-encoded request bodies
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(`${uploadsPublicPath}/products`, uploadsStaticMiddleware('products'));

// Session management middleware - handles user sessions
app.use(sessionMiddleware);

// Authentication middleware - handles user authentication
app.use(passport.initialize());
app.use(passport.session());
app.use(attachUserToRequestContext);

// Traffic logging middleware - logs all incoming requests
app.use(trafficLogger);

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));
app.get('/metrics', metricsHandler);

export async function configureApp() {
    // Route loading - dynamically loads all application routes
    await loadRoutes(app);
    appWinston.info(`All routes loaded`);

    // Error handling middleware - handles 404 and other errors
    app.use(notFound);
    app.use(errorHandler);

    return app;
}

export default app;
