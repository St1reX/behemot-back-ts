import { OperationStatus } from '@prisma/client';
import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import { frontendUrl } from '../../config/env';
import { AppError, ErrorNames } from '../../errors/errorHandler';
import { createAuditLog } from '../../infrastructure/audit/auditLogger';
import { ACTIONS } from '../../shared/constants/actions';
import { ENTITIES } from '../../shared/constants/entities';
import { ROLES } from '../../shared/constants/roles';
import { MailingService } from '../mailing/mailing.service';
import { mapRegistrationTokenAuditData } from './mappers/authMapper';
import { AuthRepository } from './repositories/authRepository';
import {
    RegisterUserDTO,
    ResendRegistrationMailDTO,
    VerifyAccountDTO,
} from './schemas/auth.schema';
import {
    RegisteredUserResponse,
    ResendRegistrationMailResponse,
    VerifyAccountResponse,
} from './types/auth.types';

const scryptAsync = promisify(scrypt);
const REGISTRATION_TOKEN_EXPIRATION_HOURS = 24;
const REGISTRATION_MAIL_RESEND_COOLDOWN_MINUTES = 10;

function getRegistrationTokenExpirationDate() {
    return new Date(Date.now() + REGISTRATION_TOKEN_EXPIRATION_HOURS * 60 * 60 * 1000);
}

function createConfirmationLink(registrationToken: string) {
    const confirmationUrl = new URL('verify-account', `${frontendUrl.replace(/\/+$/, '')}/`);
    confirmationUrl.searchParams.set('token', registrationToken);

    return confirmationUrl.toString();
}

export class AuthService {
    static async registerUser(userData: RegisterUserDTO): Promise<RegisteredUserResponse> {
        const existingUser = await AuthRepository.findByEmailOrUsername(userData.email, userData.username);

        if (existingUser) {
            throw new AppError(ErrorNames.CONFLICT, 409, 'Adres e-mail lub nazwa użytkownika są już zajęte.');
        }

        const defaultRole = await AuthRepository.findRoleByName(ROLES.USER);

        if (!defaultRole) {
            throw new AppError(ErrorNames.INTERNAL_SERVER_ERROR, 500, 'Default user role is missing');
        }

        const passwordSalt = randomBytes(16).toString('hex');
        const passwordHash = (await scryptAsync(userData.password, passwordSalt, 64)) as Buffer;
        const registrationToken = randomBytes(32).toString('hex');

        const { registrationToken: createdRegistrationToken, ...createdUser } = await AuthRepository.create({
            email: userData.email,
            username: userData.username,
            passwordHash: `${passwordSalt}:${passwordHash.toString('hex')}`,
            isActive: false,
            role: {
                connect: {
                    id: defaultRole.id,
                },
            },
            registrationToken: {
                create: {
                    token: registrationToken,
                    expiresAt: getRegistrationTokenExpirationDate(),
                },
            },
        });

        await createAuditLog({
            userId: createdUser.id,
            entityName: ENTITIES.USER,
            entityId: createdUser.id,
            action: ACTIONS.CREATE,
            operationStatus: OperationStatus.SUCCESS,
            dataBefore: null,
            dataAfter: createdUser,
        });

        if (createdRegistrationToken) {
            await createAuditLog({
                userId: createdUser.id,
                entityName: ENTITIES.REGISTRATION_TOKEN,
                entityId: createdRegistrationToken.id,
                action: ACTIONS.CREATE,
                operationStatus: OperationStatus.SUCCESS,
                dataBefore: null,
                dataAfter: createdRegistrationToken,
            });
        }

        await MailingService.sendAccountVerificationMail({
            to: userData.email,
            username: userData.username,
            confirmationLink: createConfirmationLink(registrationToken),
        });

        return createdUser;
    }

    static async resendRegistrationMail(
        userData: ResendRegistrationMailDTO,
    ): Promise<ResendRegistrationMailResponse> {
        const RESEND_REGISTRATION_MAIL_MESSAGE =
            'If the account exists and is inactive, a verification email has been sent';

        const user = await AuthRepository.findForRegistrationMail(userData.email);

        const registrationTokenData = user?.registrationToken;

        if (
            !user ||
            user.isActive ||
            !registrationTokenData ||
            registrationTokenData.deletedAt ||
            registrationTokenData.accepted
        ) {
            return {
                message: RESEND_REGISTRATION_MAIL_MESSAGE,
            };
        }

        const registrationMailResendAvailableAt = new Date(
            registrationTokenData.updatedAt.getTime() +
            REGISTRATION_MAIL_RESEND_COOLDOWN_MINUTES * 60 * 1000,
        );

        if (registrationMailResendAvailableAt > new Date()) {
            throw new AppError(
                ErrorNames.TOO_MANY_REQUESTS,
                429,
                'Wiadomość aktywacyjną można wysłać ponownie raz na 10 minut.',
            );
        }

        const updatedRegistrationToken = await AuthRepository.extendRegistrationToken(
            registrationTokenData.id,
            getRegistrationTokenExpirationDate(),
        );

        await createAuditLog({
            userId: user.id,
            entityName: ENTITIES.REGISTRATION_TOKEN,
            entityId: registrationTokenData.id,
            action: ACTIONS.UPDATE,
            operationStatus: OperationStatus.SUCCESS,
            dataBefore: mapRegistrationTokenAuditData(registrationTokenData),
            dataAfter: updatedRegistrationToken,
        });

        await MailingService.sendAccountVerificationMail({
            to: user.email,
            username: user.username,
            confirmationLink: createConfirmationLink(registrationTokenData.token),
        });

        return {
            message: RESEND_REGISTRATION_MAIL_MESSAGE,
        };
    }

    static async verifyAccount(userData: VerifyAccountDTO): Promise<VerifyAccountResponse> {
        const registrationTokenData = await AuthRepository.findRegistrationToken(userData.token);

        if (!registrationTokenData) {
            throw new AppError(ErrorNames.BAD_REQUEST, 400, 'Link aktywacyjny jest nieprawidłowy.');
        }

        if (registrationTokenData.accepted || registrationTokenData.expiresAt < new Date()) {
            throw new AppError(ErrorNames.BAD_REQUEST, 400, 'Link aktywacyjny wygasł lub został już wykorzystany. Jeśli konto zostało aktywowane, możesz się zalogować.');
        }

        const acceptedAt = new Date();

        const verificationResult = await AuthRepository.verifyAccount(
            registrationTokenData.id,
            registrationTokenData.userId,
            acceptedAt,
        );

        if (!verificationResult) {
            throw new AppError(ErrorNames.BAD_REQUEST, 400, 'Link aktywacyjny wygasł lub został już wykorzystany. Jeśli konto zostało aktywowane, możesz się zalogować.');
        }

        const [updatedRegistrationToken, updatedUser] = verificationResult;

        await createAuditLog({
            userId: registrationTokenData.userId,
            entityName: ENTITIES.REGISTRATION_TOKEN,
            entityId: registrationTokenData.id,
            action: ACTIONS.UPDATE,
            operationStatus: OperationStatus.SUCCESS,
            dataBefore: mapRegistrationTokenAuditData(registrationTokenData),
            dataAfter: updatedRegistrationToken,
        });

        await createAuditLog({
            userId: registrationTokenData.userId,
            entityName: ENTITIES.USER,
            entityId: registrationTokenData.userId,
            action: ACTIONS.UPDATE,
            operationStatus: OperationStatus.SUCCESS,
            dataBefore: registrationTokenData.user,
            dataAfter: updatedUser,
        });

        await MailingService.sendWelcomeMail({
            to: updatedUser.email,
            username: updatedUser.username,
        });

        return {
            message: 'Account has been verified successfully',
        };
    }
}
