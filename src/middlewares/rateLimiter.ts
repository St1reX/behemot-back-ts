import { rateLimit } from 'express-rate-limit';
import { AppError, ErrorNames } from '../errors/errorHandler';

export const limiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 200,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    ipv6Subnet: 56,
    handler: (_req, _res, next) => {
        next(new AppError(
            ErrorNames.TOO_MANY_REQUESTS,
            429,
            'Zbyt wiele żądań. Spróbuj ponownie później.',
        ));
    },
});
