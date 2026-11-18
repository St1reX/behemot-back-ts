import { RegistrationToken } from '@prisma/client';
import type { AuthRepository } from '../repositories/authRepository';
import { AuthenticatedUser } from '../types/auth.types';

type SessionUser = NonNullable<Awaited<ReturnType<typeof AuthRepository.findSessionUserById>>>;
type RegistrationTokenAuditData = Pick<
    RegistrationToken,
    'id' | 'accepted' | 'acceptedAt' | 'expiresAt' | 'updatedAt'
>;

export function mapAuthenticatedUser(user: SessionUser): AuthenticatedUser {
    return {
        id: user.id,
        email: user.email,
        username: user.username,
        profilePictureUrl: user.profilePictureUrl,
        role: {
            id: user.role.id,
            name: user.role.name,
            privileges: user.role.privileges,
        },
        isActive: user.isActive,
    };
}

export function mapRegistrationTokenAuditData(
    token: RegistrationTokenAuditData,
): RegistrationTokenAuditData {
    return {
        id: token.id,
        accepted: token.accepted,
        acceptedAt: token.acceptedAt,
        expiresAt: token.expiresAt,
        updatedAt: token.updatedAt,
    };
}
