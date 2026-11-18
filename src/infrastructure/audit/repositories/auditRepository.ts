import { Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';

export class AuditRepository {
    static create(data: Prisma.LogUncheckedCreateInput) {
        return prisma.log.create({ data });
    }
}
