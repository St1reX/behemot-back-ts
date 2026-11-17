import { NextFunction, Request, Response } from 'express';
import { getRequestContext } from '../infrastructure/requestContext/requestContext';

export function attachUserToRequestContext(req: Request, _res: Response, next: NextFunction) {
    const requestContext = getRequestContext();

    if (requestContext && req.user) {
        requestContext.userId = req.user.id;
    }

    next();
}
