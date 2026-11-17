import { AuthenticatedUser } from '../modules/auth/types/auth.types';

declare global {
  namespace Express {
    interface User extends AuthenticatedUser {}

    interface Request {
      id: string;
    }
  }
}

export {};
