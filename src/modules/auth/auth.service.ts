import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import { prisma } from '../../config/database';
import { AppError, ErrorNames } from '../../errors/errorHandler';
import { ROLES } from '../../shared/constants/roles';
import {
    RegisterUserDTO,
    ResendRegistrationMailDTO,
    VerifyAccountDTO,
} from './schemas/auth.schema';
import { apiPort, apiUrl } from '../../config/env';
import { MailingService } from '../mailing/mailing.service';
import { createAuditLog } from '../../infrastructure/audit/auditLogger';
import { ENTITIES } from '../../shared/constants/entities';
import { ACTIONS } from '../../shared/constants/actions';
import { OperationStatus } from '@prisma/client';
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
    const confirmationUrl = new URL('/auth/verify-account', `${apiUrl}:${apiPort}`);
    confirmationUrl.searchParams.set('token', registrationToken);

    return confirmationUrl.toString();
}

export class AuthService {
    static async registerUser(userData: RegisterUserDTO): Promise<RegisteredUserResponse> {
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [{ email: userData.email }, { username: userData.username }],
            },
        });

        if (existingUser) {
            throw new AppError(ErrorNames.CONFLICT, 409, 'Email or username is already in use');
        }

        const defaultRole = await prisma.role.findFirst({
            where: {
                name: ROLES.USER,
                deletedAt: null,
            },
            select: {
                id: true,
            },
        });

        if (!defaultRole) {
            throw new AppError(ErrorNames.INTERNAL_SERVER_ERROR, 500, 'Default user role is missing');
        }

        const passwordSalt = randomBytes(16).toString('hex');
        const passwordHash = (await scryptAsync(userData.password, passwordSalt, 64)) as Buffer;
        const registrationToken = randomBytes(32).toString('hex');

        const createdUser = await prisma.user.create({
            data: {
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
            },
            select: {
                id: true,
                username: true,
                email: true,
                profilePictureUrl: true,
                role: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
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

        const user = await prisma.user.findFirst({
            where: {
                email: userData.email,
                deletedAt: null,
            },
            select: {
                id: true,
                email: true,
                username: true,
                isActive: true,
                registrationToken: {
                    select: {
                        id: true,
                        token: true,
                        accepted: true,
                        acceptedAt: true,
                        expiresAt: true,
                        updatedAt: true,
                        deletedAt: true,
                    },
                },
            },
        });

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
                'Registration email can be resent once every 10 minutes',
            );
        }

        const updatedRegistrationToken = await prisma.registrationToken.update({
            where: {
                id: registrationTokenData.id,
                deletedAt: null,
            },
            data: {
                expiresAt: getRegistrationTokenExpirationDate(),
            },
            select: {
                id: true,
                accepted: true,
                acceptedAt: true,
                expiresAt: true,
                updatedAt: true,
            },
        });

        await createAuditLog({
            userId: user.id,
            entityName: ENTITIES.REGISTRATION_TOKEN,
            entityId: registrationTokenData.id,
            action: ACTIONS.UPDATE,
            operationStatus: OperationStatus.SUCCESS,
            dataBefore: {
                id: registrationTokenData.id,
                accepted: registrationTokenData.accepted,
                acceptedAt: registrationTokenData.acceptedAt,
                expiresAt: registrationTokenData.expiresAt,
                updatedAt: registrationTokenData.updatedAt,
            },
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
        const registrationTokenData = await prisma.registrationToken.findFirst({
            where: {
                token: userData.token,
                deletedAt: null,
                user: {
                    deletedAt: null,
                },
            },
            select: {
                id: true,
                userId: true,
                accepted: true,
                acceptedAt: true,
                expiresAt: true,
                updatedAt: true,
                user: {
                    select: {
                        id: true,
                        email: true,
                        username: true,
                        isActive: true,
                        updatedAt: true,
                    },
                },
            },
        });

        if (!registrationTokenData) {
            throw new AppError(ErrorNames.BAD_REQUEST, 400, 'Invalid registration token');
        }

        if (registrationTokenData.accepted || registrationTokenData.expiresAt < new Date()) {
            throw new AppError(ErrorNames.BAD_REQUEST, 400, 'Registration token is no longer valid');
        }

        const acceptedAt = new Date();

        const [updatedRegistrationToken, updatedUser] = await prisma.$transaction(async (tx) => {
            const updatedTokens = await tx.registrationToken.updateMany({
                where: {
                    id: registrationTokenData.id,
                    accepted: false,
                    deletedAt: null,
                    expiresAt: {
                        gt: acceptedAt,
                    },
                },
                data: {
                    accepted: true,
                    acceptedAt,
                },
            });

            if (updatedTokens.count !== 1) {
                throw new AppError(
                    ErrorNames.BAD_REQUEST,
                    400,
                    'Registration token is no longer valid',
                );
            }

            const updatedRegistrationToken = await tx.registrationToken.findUniqueOrThrow({
                where: {
                    id: registrationTokenData.id,
                    deletedAt: null,
                },
                select: {
                    id: true,
                    accepted: true,
                    acceptedAt: true,
                    expiresAt: true,
                    updatedAt: true,
                },
            });

            const updatedUser = await tx.user.update({
                where: {
                    id: registrationTokenData.userId,
                    deletedAt: null,
                },
                data: {
                    isActive: true,
                },
                select: {
                    id: true,
                    email: true,
                    username: true,
                    isActive: true,
                    updatedAt: true,
                },
            });

            return [updatedRegistrationToken, updatedUser];
        });

        await createAuditLog({
            userId: registrationTokenData.userId,
            entityName: ENTITIES.REGISTRATION_TOKEN,
            entityId: registrationTokenData.id,
            action: ACTIONS.UPDATE,
            operationStatus: OperationStatus.SUCCESS,
            dataBefore: {
                id: registrationTokenData.id,
                accepted: registrationTokenData.accepted,
                acceptedAt: registrationTokenData.acceptedAt,
                expiresAt: registrationTokenData.expiresAt,
                updatedAt: registrationTokenData.updatedAt,
            },
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
