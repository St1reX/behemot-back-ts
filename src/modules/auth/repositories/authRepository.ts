import { Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';

const authenticatedUserSelect = {
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
                where: { deletedAt: null },
                select: { id: true, name: true },
            },
        },
    },
    isActive: true,
} satisfies Prisma.UserSelect;

export class AuthRepository {
    static findByEmailOrUsername(email: string, username: string) {
        return prisma.user.findFirst({
            where: {
                OR: [{ email }, { username }],
            },
        });
    }

    static findRoleByName(name: string) {
        return prisma.role.findFirst({
            where: {
                name,
                deletedAt: null,
            },
            select: {
                id: true,
            },
        });
    }

    static create(data: Prisma.UserCreateInput) {
        return prisma.user.create({
            data,
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
    }

    static findForRegistrationMail(email: string) {
        return prisma.user.findFirst({
            where: {
                email,
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
    }

    static extendRegistrationToken(tokenId: string, expiresAt: Date) {
        return prisma.registrationToken.update({
            where: {
                id: tokenId,
                deletedAt: null,
            },
            data: {
                expiresAt,
            },
            select: {
                id: true,
                accepted: true,
                acceptedAt: true,
                expiresAt: true,
                updatedAt: true,
            },
        });
    }

    static findRegistrationToken(token: string) {
        return prisma.registrationToken.findFirst({
            where: {
                token,
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
    }

    static verifyAccount(tokenId: string, userId: string, acceptedAt: Date) {
        return prisma.$transaction(async (tx) => {
            const updatedTokens = await tx.registrationToken.updateMany({
                where: {
                    id: tokenId,
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
                return null;
            }

            const updatedRegistrationToken = await tx.registrationToken.findUniqueOrThrow({
                where: {
                    id: tokenId,
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
                    id: userId,
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

            return [updatedRegistrationToken, updatedUser] as const;
        });
    }

    static findCredentialsByUsername(username: string) {
        return prisma.user.findFirst({
            where: { username, deletedAt: null },
            select: { ...authenticatedUserSelect, passwordHash: true },
        });
    }

    static findSessionUserById(id: string) {
        return prisma.user.findFirst({
            where: { id, deletedAt: null },
            select: authenticatedUserSelect,
        });
    }
}
