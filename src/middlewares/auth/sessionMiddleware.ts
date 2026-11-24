import session from 'express-session';
import { RedisStore } from 'connect-redis';
import { redisClient } from '../../config/redis';
import { env, isProduction } from '../../config/env';

export const sessionCookieName = 'behemot-api-sid';

export const sessionCookieOptions = {
      secure: isProduction,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: isProduction ? 'none' : 'lax',
      domain: isProduction ? env.COOKIE_DOMAIN : undefined,
} as const;

export const sessionMiddleware = session({
   store: new RedisStore({ client: redisClient }),
   secret: env.SESSION_SECRET,
   resave: true,
   rolling: true,
   name: sessionCookieName,
   saveUninitialized: false,
   cookie: sessionCookieOptions,
});
