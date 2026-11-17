import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorNames } from '../errors/errorHandler';

export function requireRole(allowedRoles: string | string[]) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return function (req: Request, res: Response, next: NextFunction) {
    const user = req.user;

    if (!user) {
      return next(
        new AppError(ErrorNames.AUTHENTICATION_ERROR, 401, 'User not authenticated')
      );
    }

    const userRole = user.role?.name;
    if (!userRole || !roles.includes(userRole)) {
      return next(new AppError(ErrorNames.FORBIDDEN, 403, 'Access denied'));
    }

    next();
  };
}
