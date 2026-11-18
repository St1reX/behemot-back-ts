import { scrypt, timingSafeEqual } from 'crypto';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { promisify } from 'util';
import { AppError, ErrorNames } from '../errors/errorHandler';
import { mapAuthenticatedUser } from '../modules/auth/mappers/authMapper';
import { AuthRepository } from '../modules/auth/repositories/authRepository';

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
            usernameField: 'username',
            passwordField: 'password',
        },
        async (username, password, done) => {
            try {
                const user = await AuthRepository.findCredentialsByUsername(username);

                if (!user || !(await isPasswordValid(password, user.passwordHash))) {
                    return done(
                        new AppError(ErrorNames.AUTHENTICATION_ERROR, 401, 'Nieprawidłowa nazwa użytkownika lub hasło.'),
                    );
                }

                if (!user.isActive || user.role.deletedAt) {
                    return done(
                        new AppError(ErrorNames.AUTHENTICATION_ERROR, 401, 'Konto jest nieaktywne lub nie ma aktywnej roli. Skontaktuj się z administratorem.'),
                    );
                }

                return done(null, mapAuthenticatedUser(user));
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
        const user = await AuthRepository.findSessionUserById(id);

        if (!user || !user.isActive || user.role.deletedAt) {
            return done(null, false);
        }

        return done(null, mapAuthenticatedUser(user));
    } catch (error) {
        return done(error);
    }
});

export default passport;
