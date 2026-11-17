import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorNames } from '../errors/errorHandler';

export const requireGuest = (req: Request, res: Response, next: NextFunction) => {
    if (req.user) {
        return next(new AppError(ErrorNames.FORBIDDEN, 403, 'You are already authenticated'));
    }

    next();
};
