import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';
import { requestContextStorage } from '../infrastructure/requestContext/requestContext';

export function requestId(req: Request, res: Response, next: NextFunction) {
  const requestId = uuidv4();

  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);

  requestContextStorage.run(
    {
      requestId,
      sourceIp: req.ip,
    },
    next
  );
}
