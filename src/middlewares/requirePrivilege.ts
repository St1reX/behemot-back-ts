import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorNames } from '../errors/errorHandler';

export function requirePrivilege(requiredPrivileges: string | string[]) {
  const privileges = Array.isArray(requiredPrivileges)
    ? requiredPrivileges
    : [requiredPrivileges];

  return function (req: Request, res: Response, next: NextFunction) {
    const user = req.user;

    if (!user) {
      return next(
        new AppError(ErrorNames.AUTHENTICATION_ERROR, 401, 'Zaloguj się, aby kontynuować.')
      );
    }

    const userPrivileges = user.role.privileges.map((privilege) => privilege.name);
    const hasPrivilege = privileges.some((privilege) =>
      userPrivileges.includes(privilege)
    );

    if (!hasPrivilege) {
      return next(
        new AppError(ErrorNames.FORBIDDEN, 403, 'Nie masz uprawnień do wykonania tej operacji.')
      );
    }

    next();
  };
}
