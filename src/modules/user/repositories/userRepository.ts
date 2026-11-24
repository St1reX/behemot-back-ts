import { Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';
import { UpdateUserDTO } from '../schemas/user.schema';

const userSelect = {
    id: true,
    username: true,
    email: true,
    roleId: true,
    role: { select: { id: true, name: true } },
    departmentId: true,
    department: { select: { id: true, name: true } },
    isActive: true,
    createdAt: true,
    updatedAt: true,
} satisfies Prisma.UserSelect;

export class UserRepository {
    static findAll() {
        return prisma.user.findMany({
            where: { deletedAt: null },
            select: userSelect,
            orderBy: { username: 'asc' },
        });
    }

    static findById(id: string) {
        return prisma.user.findFirst({ where: { id, deletedAt: null }, select: userSelect });
    }

    static findConflict({ email, username }: UpdateUserDTO, excludedId?: string) {
        return prisma.user.findFirst({
            // Unique constraints also include soft-deleted accounts.
            where: { id: excludedId ? { not: excludedId } : undefined, OR: [{ email }, { username }] },
            select: { id: true },
        });
    }

    static create(data: UpdateUserDTO & { passwordHash: string }) {
        return prisma.user.create({ data, select: userSelect });
    }

    static update(id: string, data: UpdateUserDTO, invalidateRegistrationToken: boolean) {
        return prisma.$transaction(async (tx) => {
            // An old verification link must not reactivate an account disabled by an administrator.
            if (invalidateRegistrationToken) {
                await tx.registrationToken.updateMany({
                    where: { userId: id, deletedAt: null },
                    data: { deletedAt: new Date() },
                });
            }
            return tx.user.update({ where: { id, deletedAt: null }, data, select: userSelect });
        });
    }

    static softDelete(id: string) {
        return prisma.$transaction(async (tx) => {
            const deletedAt = new Date();
            await tx.registrationToken.updateMany({
                where: { userId: id, deletedAt: null },
                data: { deletedAt },
            });
            return tx.user.update({
                where: { id, deletedAt: null },
                data: { deletedAt, isActive: false },
                select: userSelect,
            });
        });
    }
}
