import { scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { prisma } from './database';
import { AppError, ErrorNames } from '../errors/errorHandler';

const scryptAsync = promisify(scrypt);

async function isPasswordValid(password: string, storedPasswordHash: string) {
   const [passwordSalt, expectedPasswordHash] = storedPasswordHash.split(':');

   if (!passwordSalt || !expectedPasswordHash) {
      return false;
   }

   const expectedPasswordHashBuffer = Buffer.from(expectedPasswordHash, 'hex');
   const passwordHash = (await scryptAsync(
      password,
      passwordSalt,
      expectedPasswordHashBuffer.length,
   )) as Buffer;

   return (
      passwordHash.length === expectedPasswordHashBuffer.length &&
      timingSafeEqual(passwordHash, expectedPasswordHashBuffer)
   );
}

passport.use(
   new LocalStrategy(
      {
         usernameField: 'email',
         passwordField: 'password',
      },
      async (email, password, done) => {
         try {
            const user = await prisma.user.findFirst({
               where: {
                  email,
                  deletedAt: null,
               },
               select: {
                  id: true,
                  email: true,
                  username: true,
                  passwordHash: true,
                  profilePictureUrl: true,
                  role: {
                     select: {
                        id: true,
                        name: true,
                        deletedAt: true,
                        privileges: {
                           where: {
                              deletedAt: null,
                           },
                           select: {
                              id: true,
                              name: true,
                           },
                        },
                     },
                  },
                  isActive: true,
               },
            });

            if (!user || !(await isPasswordValid(password, user.passwordHash))) {
               return done(
                  new AppError(ErrorNames.AUTHENTICATION_ERROR, 401, 'Invalid email or password'),
               );
            }

            if (!user.isActive || user.role.deletedAt) {
               return done(
                  new AppError(ErrorNames.AUTHENTICATION_ERROR, 401, 'Account is not active'),
               );
            }

            const { passwordHash, role: userRole, ...authenticatedUser } = user;
            const { deletedAt, ...activeRole } = userRole;

            return done(null, { ...authenticatedUser, role: activeRole });
         } catch (error) {
            return done(error);
         }
      },
   ),
);

passport.serializeUser((user, done) => {
   done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
   try {
      const user = await prisma.user.findFirst({
         where: {
            id,
            deletedAt: null,
         },
         select: {
            id: true,
            email: true,
            username: true,
            profilePictureUrl: true,
            role: {
               select: {
                  id: true,
                  name: true,
                  deletedAt: true,
                  privileges: {
                     where: {
                        deletedAt: null,
                     },
                     select: {
                        id: true,
                        name: true,
                     },
                  },
               },
            },
            isActive: true,
         },
      });

      if (!user || !user.isActive || user.role.deletedAt) {
         return done(null, false);
      }

      const { role: userRole, ...authenticatedUser } = user;
      const { deletedAt, ...activeRole } = userRole;

      return done(null, { ...authenticatedUser, role: activeRole });
   } catch (error) {
      return done(error);
   }
});

export default passport;
