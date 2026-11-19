import { Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';
import { AuditLogQuery } from '../schemas/auditLog.schema';

const auditLogSelect = {
    id: true, userId: true, entityName: true, entityId: true, action: true,
    operationStatus: true, comment: true, sourceIp: true, isSuspicious: true,
    suspiciousReason: true, requestId: true, createdAt: true,
} satisfies Prisma.LogSelect;

export class AuditLogRepository {
    static async findPage(query: AuditLogQuery) {
        const users = query.search ? await prisma.user.findMany({
            where: { username: { contains: query.search, mode: 'insensitive' } },
            select: { id: true },
        }) : [];
        const where: Prisma.LogWhereInput = {
            entityName: query.entityName,
            action: query.action,
            operationStatus: query.operationStatus,
            createdAt: { gte: query.from ? new Date(query.from) : undefined, lte: query.to ? new Date(query.to) : undefined },
            ...(query.search ? { OR: [
                { entityId: { contains: query.search, mode: 'insensitive' } },
                { userId: { contains: query.search, mode: 'insensitive' } },
                { comment: { contains: query.search, mode: 'insensitive' } },
                { userId: { in: users.map((user) => user.id) } },
            ] } : {}),
        };
        const [items, total] = await prisma.$transaction([
            prisma.log.findMany({
                where, select: auditLogSelect,
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                skip: (query.page - 1) * query.pageSize, take: query.pageSize,
            }),
            prisma.log.count({ where }),
        ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
        return { items, total };
    }

    static findById(id: string) {
        return prisma.log.findUnique({ where: { id } });
    }

    static findUsers(ids: string[]) {
        return prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, username: true } });
    }
}
