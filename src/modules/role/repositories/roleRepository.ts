import { prisma } from '../../../config/database';
import { CreateRoleDTO } from '../schemas/role.schema';

const roleDetailsSelect = {
    id: true,
    name: true,
    privileges: {
        where: {
            deletedAt: null,
        },
        select: {
            id: true,
            name: true,
        },
        orderBy: {
            name: 'asc' as const,
        },
    },
    createdAt: true,
    updatedAt: true,
};

const roleSelect = {
    id: true,
    name: true,
    createdAt: true,
    updatedAt: true,
};

export class RoleRepository {
    static findPrivileges() {
        return prisma.privilege.findMany({
            where: {
                deletedAt: null,
            },
            select: {
                id: true,
                name: true,
            },
            orderBy: {
                name: 'asc',
            },
        });
    }

    static findAll() {
        return prisma.role.findMany({
            where: {
                deletedAt: null,
            },
            select: roleSelect,
            orderBy: {
                name: 'asc',
            },
        });
    }

    static findById(roleId: string) {
        return prisma.role.findFirst({
            where: {
                id: roleId,
                deletedAt: null,
            },
            select: roleDetailsSelect,
        });
    }

    static async existsById(roleId: string): Promise<boolean> {
        const role = await prisma.role.findFirst({
            where: { id: roleId, deletedAt: null },
            select: { id: true },
        });
        return role !== null;
    }

    static create(roleData: Pick<CreateRoleDTO, 'name'>, privilegeIds: string[] = []) {
        return prisma.role.create({
            data: {
                name: roleData.name,
                privileges: {
                    connect: privilegeIds.map((id) => ({ id })),
                },
            },
            select: roleDetailsSelect,
        });
    }

    static update(roleId: string, name: string, privilegeIds: string[]) {
        return prisma.role.update({
            where: { id: roleId, deletedAt: null },
            data: {
                name,
                privileges: {
                    set: privilegeIds.map((id) => ({ id })),
                },
            },
            select: roleDetailsSelect,
        });
    }

    static countAssignedUsers(roleId: string) {
        return prisma.user.count({
            where: {
                AND: [{ roleId }, { deletedAt: null }],
            },
        });
    }

    static softDelete(roleId: string) {
        return prisma.role.update({
            where: {
                id: roleId,
                deletedAt: null,
            },
            data: {
                deletedAt: new Date(),
            },
        });
    }

    static grantPrivileges(roleId: string, privilegeIdsToGrant: string[]) {
        return prisma.role.update({
            where: {
                id: roleId,
                deletedAt: null,
            },
            data: {
                privileges: {
                    connect: privilegeIdsToGrant.map((privilegeId) => ({
                        id: privilegeId,
                    })),
                },
            },
            select: roleDetailsSelect,
        });
    }

    static revokePrivileges(roleId: string, privilegeIdsToRevoke: string[]) {
        return prisma.role.update({
            where: {
                id: roleId,
                deletedAt: null,
            },
            data: {
                privileges: {
                    disconnect: privilegeIdsToRevoke.map((privilegeId) => ({
                        id: privilegeId,
                    })),
                },
            },
            select: roleDetailsSelect,
        });
    }

    static findActivePrivileges(uniquePrivilegeIds: string[]) {
        return prisma.privilege.findMany({
            where: {
                id: {
                    in: uniquePrivilegeIds,
                },
                deletedAt: null,
            },
            select: {
                id: true,
            },
        });
    }

    static findByName(roleName: string, excludedRoleId?: string) {
        return prisma.role.findFirst({
            where: {
                name: roleName,
                id: excludedRoleId ? { not: excludedRoleId } : undefined,
                deletedAt: null,
            },
            select: {
                id: true,
            },
        });
    }

    static findActiveUserRole(userId: string) {
        return prisma.user.findFirst({
            where: {
                id: userId,
                deletedAt: null,
            },
            select: {
                roleId: true,
            },
        });
    }

    static upsertPrivilege(name: string) {
        return prisma.privilege.upsert({
            where: { name },
            update: { deletedAt: null },
            create: { name },
        });
    }

    static findByNameOrThrow(name: string) {
        return prisma.role.findFirstOrThrow({
            where: { name, deletedAt: null },
            select: { id: true },
        });
    }

    static replacePrivileges(roleId: string, privilegeNames: string[]) {
        return prisma.role.update({
            where: { id: roleId, deletedAt: null },
            data: {
                privileges: {
                    set: [],
                    connect: privilegeNames.map((name) => ({ name })),
                },
            },
        });
    }
}
