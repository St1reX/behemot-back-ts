import { prisma } from '../../../config/database';

export class HealthRepository {
    static checkDatabaseConnection() {
        return prisma.$queryRaw`SELECT 1`;
    }
}
