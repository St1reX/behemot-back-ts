import { Request, Response, NextFunction } from 'express';
import passport from '../../config/passport';
import { AppError, ErrorNames } from '../../errors/errorHandler';
import {
    LoginUserSchema,
    RegisterUserSchema,
    ResendRegistrationMailSchema,
    VerifyAccountSchema,
} from './schemas/auth.schema';
import { AuthService } from './auth.service';
import {
    CurrentUserResponse,
    LoginUserResponse,
    LogoutUserResponse,
    RegisteredUserResponse,
    ResendRegistrationMailResponse,
    VerifyAccountResponse,
} from './types/auth.types';
import { sessionCookieName, sessionCookieOptions } from '../../middlewares/sessionMiddleware';

export class AuthController {
    static getCurrentUser(req: Request, res: Response<CurrentUserResponse>, next: NextFunction) {
        if (!req.user) {
            next(new AppError(ErrorNames.AUTHENTICATION_ERROR, 401, 'User not authenticated'));
            return;
        }

        res.status(200).json({ user: req.user });
    }

    static loginUser(req: Request, res: Response<LoginUserResponse>, next: NextFunction) {
        try {
            LoginUserSchema.parse(req.body);
        } catch (error) {
            next(error);
            return;
        }

        passport.authenticate('local', (error: Error | null, user: Express.User | false) => {
            if (error) {
                next(error);
                return;
            }

            if (!user) {
                next(new AppError(ErrorNames.AUTHENTICATION_ERROR, 401, 'Invalid email or password'));
                return;
            }

            req.logIn(user, (loginError) => {
                if (loginError) {
                    next(loginError);
                    return;
                }

                res.status(200).json({ user });
            });
        })(req, res, next);
    }

    static async registerUser(
        req: Request,
        res: Response<RegisteredUserResponse>,
        next: NextFunction,
    ) {
        try {
            const validatedData = RegisterUserSchema.parse(req.body);

            const result = await AuthService.registerUser(validatedData);

            res.status(201).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static logoutUser(req: Request, res: Response<LogoutUserResponse>, next: NextFunction) {
        req.logout((logoutError) => {
            if (logoutError) {
                next(logoutError);
                return;
            }

            req.session.destroy((sessionError) => {
                if (sessionError) {
                    next(sessionError);
                    return;
                }

                res.clearCookie(sessionCookieName, sessionCookieOptions);
                res.status(200).json({ message: 'User has been logged out successfully' });
            });
        });
    }

    static async resendRegistrationMail(
        req: Request,
        res: Response<ResendRegistrationMailResponse>,
        next: NextFunction,
    ) {
        try {
            const validatedData = ResendRegistrationMailSchema.parse(req.body);

            const result = await AuthService.resendRegistrationMail(validatedData);

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }

    static async verifyAccount(
        req: Request,
        res: Response<VerifyAccountResponse>,
        next: NextFunction,
    ) {
        try {
            const validatedData = VerifyAccountSchema.parse(req.query);

            const result = await AuthService.verifyAccount(validatedData);

            res.status(200).json(result);
        } catch (error) {
            next(error);
            return;
        }
    }
}
