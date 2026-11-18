import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorNames } from '../errors/errorHandler';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return next(
      new AppError(ErrorNames.AUTHENTICATION_ERROR, 401, 'Zaloguj się, aby kontynuować.')
    );
  }

  next();
}
