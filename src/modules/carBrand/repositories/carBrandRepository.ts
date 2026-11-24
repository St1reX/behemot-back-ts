import { Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';
import { PaginatedListQuery } from '../../../shared/schema/pagination.schema';
import { CreateCarBrandDTO, UpdateCarBrandDTO } from '../schemas/carBrand.schema';

const carBrandSelect = {
    id: true,
    name: true,
    createdAt: true,
    updatedAt: true,
};

export class CarBrandRepository {
    static async findPage(query: PaginatedListQuery) {
        const where: Prisma.CarBrandWhereInput = {
            deletedAt: null,
            ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
        };
        const [items, total] = await prisma.$transaction([
            prisma.carBrand.findMany({
                where,
                select: carBrandSelect,
                orderBy: [{ name: 'asc' }, { id: 'asc' }],
                skip: (query.page - 1) * query.pageSize,
                take: query.pageSize,
            }),
            prisma.carBrand.count({ where }),
        ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
        return { items, total };
    }

    static findAll() {
        return prisma.carBrand.findMany({
            where: {
                deletedAt: null,
            },
            select: carBrandSelect,
            orderBy: {
                name: 'asc',
            },
        });
    }

    static findById(carBrandId: string) {
        return prisma.carBrand.findFirst({
            where: {
                id: carBrandId,
                deletedAt: null,
            },
            select: carBrandSelect,
        });
    }

    static create(carBrandData: CreateCarBrandDTO) {
        return prisma.carBrand.create({
            data: carBrandData,
            select: carBrandSelect,
        });
    }

    static update(carBrandId: string, carBrandData: UpdateCarBrandDTO) {
        return prisma.carBrand.update({
            where: {
                id: carBrandId,
                deletedAt: null,
            },
            data: carBrandData,
            select: carBrandSelect,
        });
    }

    static countAssignedModels(carBrandId: string) {
        return prisma.carModel.count({
            where: {
                carBrandId,
                deletedAt: null,
            },
        });
    }

    static countAssignedFitments(carBrandId: string) {
        return prisma.productFitment.count({ where: { carBrandId, deletedAt: null, product: { deletedAt: null } } });
    }

    static softDelete(carBrandId: string) {
        return prisma.carBrand.update({
            where: {
                id: carBrandId,
                deletedAt: null,
            },
            data: {
                deletedAt: new Date(),
            },
        });
    }

    static findByName(carBrandName: string, excludedCarBrandId?: string) {
        return prisma.carBrand.findFirst({
            where: {
                id: excludedCarBrandId
                    ? {
                        not: excludedCarBrandId,
                    }
                    : undefined,
                deletedAt: null,
                name: carBrandName,
            },
            select: {
                id: true,
            },
        });
    }
}
