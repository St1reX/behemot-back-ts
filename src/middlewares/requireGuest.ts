import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorNames } from '../errors/errorHandler';

export const requireGuest = (req: Request, res: Response, next: NextFunction) => {
    if (req.user) {
        return next(new AppError(
            ErrorNames.ALREADY_AUTHENTICATED,
            403,
            'Masz już aktywną sesję. Zakończ ją, aby zalogować się ponownie.',
        ));
    }

    next();
};
