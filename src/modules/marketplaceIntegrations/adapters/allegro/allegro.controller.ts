import { NextFunction, Request, Response } from 'express';
import { frontendUrl } from '../../../../config/env';
import { appWinston } from '../../../../config/logger/appWinston';
import { AppError, ErrorNames } from '../../../../errors/errorHandler';
import { AllegroAuthorizationSchema, AllegroCallbackSchema } from './allegro.schema';
import { AllegroOAuthService } from './allegroOAuth.service';

export class AllegroController {
    static configuration(_req: Request, res: Response) {
        res.setHeader('Cache-Control', 'no-store');
        res.json({ callbackUrl: AllegroOAuthService.getCallbackUrl() });
    }

    static async authorize(req: Request, res: Response, next: NextFunction) {
        try {
            const input = AllegroAuthorizationSchema.parse(req.body);
            const result = await AllegroOAuthService.start(input, req.sessionID, req.user!.id);
            res.setHeader('Cache-Control', 'no-store');
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    static async callback(req: Request, res: Response) {
        const returnUrl = new URL(`${frontendUrl.replace(/\/+$/, '')}/integrations`);
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Referrer-Policy', 'no-referrer');
        try {
            const query = AllegroCallbackSchema.parse(req.query);
            const configuration = await AllegroOAuthService.consumeState(query.state, req.sessionID, req.user!.id);
            if (query.error === 'access_denied') {
                returnUrl.searchParams.set('allegro', 'cancelled');
            } else {
                if (query.error) {
                    throw new AppError(ErrorNames.VALIDATION_ERROR, 422, 'Allegro nie zakończyło autoryzacji. Rozpocznij łączenie ponownie.');
                }
                if (!query.code) {
                    throw new AppError(ErrorNames.VALIDATION_ERROR, 422, 'Allegro nie przekazało kodu autoryzacji. Rozpocznij łączenie ponownie.');
                }
                await AllegroOAuthService.complete(configuration, query.code);
                returnUrl.searchParams.set('allegro', 'connected');
            }
        } catch (error) {
            const message = error instanceof AppError ? error.message : 'Nie udało się połączyć konta Allegro. Rozpocznij autoryzację ponownie.';
            appWinston.warn(`Allegro OAuth (${req.id}): ${message}`);
            returnUrl.searchParams.set('allegro', 'error');
            returnUrl.searchParams.set('allegroMessage', message);
        }
        res.redirect(303, returnUrl.toString());
    }
}
