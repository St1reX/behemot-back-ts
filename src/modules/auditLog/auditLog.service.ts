import { AppError, ErrorNames } from '../../errors/errorHandler';
import { AuditLogRepository } from './repositories/auditLogRepository';
import { AuditLogQuery } from './schemas/auditLog.schema';

export class AuditLogService {
    static async getLogs(query: AuditLogQuery) {
        const { items, total } = await AuditLogRepository.findPage(query);
        const users = await AuditLogRepository.findUsers([...new Set(items.map((item) => item.userId))]);
        const usernames = new Map(users.map((user) => [user.id, user.username]));
        return {
            items: items.map((item) => ({ ...item, username: usernames.get(item.userId) ?? null })),
            total, page: query.page, pageSize: query.pageSize,
        };
    }

    static async getLog(id: string) {
        const log = await AuditLogRepository.findById(id);
        if (!log) throw new AppError(ErrorNames.RESOURCE_NOT_FOUND, 404, 'Nie znaleziono wpisu audytowego.');
        const [user] = await AuditLogRepository.findUsers([log.userId]);
        return {
            ...log, username: user?.username ?? null,
        };
    }
}
