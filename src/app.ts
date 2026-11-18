import express from 'express';
import cors from 'cors';
import { appWinston } from './config/logger/appWinston';
import { ErrorHandler, errorHandler } from './errors/errorHandler';
import passport from './config/passport';
import { sessionMiddleware } from './middlewares/sessionMiddleware';
import { limiter } from './middlewares/rateLimiter';
import { requestId } from './middlewares/requestId';
import { trafficLogger } from './middlewares/trafficLogger';
import { helmetConfig } from './middlewares/helmet';
import { loadRoutes } from './shared/utils/loadRoutes';
import { frontendUrl, isDevelopment } from './config/env';
import swaggerUi from 'swagger-ui-express';
import swaggerFile from './swagger/swagger_output.json';
import { attachUserToRequestContext } from './middlewares/attachUserToRequestContext';
import { metricsMiddleware, metricsHandler } from './middlewares/metrics';

const app = express();

//PROMETHEUS metrics
app.use(metricsMiddleware);

// Request identification middleware - adds unique ID to each request
app.use(requestId);

// Rate limiting middleware - prevents abuse by limiting request frequency
app.use(limiter);

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
        preflightContinue: false,
        optionsSuccessStatus: 200,
    }),
);

// Security middleware - adds various HTTP headers for security
app.use(helmetConfig);

// Body parsing middleware - handles JSON and URL-encoded request bodies
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

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
    app.use(ErrorHandler.notFound);
    app.use(errorHandler);

    return app;
}

export default app;
