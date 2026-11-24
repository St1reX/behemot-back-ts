import { Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';
import { PaginatedListQuery } from '../../../shared/schema/pagination.schema';
import {
    CreateCarGenerationDTO,
    UpdateCarGenerationDTO,
} from '../schemas/carGeneration.schema';

const carGenerationSelect = {
    id: true,
    startProduction: true,
    endProduction: true,
    carModel: {
        select: {
            id: true,
            name: true,
            carBrand: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    },
    createdAt: true,
    updatedAt: true,
};

export class CarGenerationRepository {
    static async findPage(query: PaginatedListQuery, carModelId?: string) {
        let searchFilter: Prisma.CarGenerationWhereInput = {};
        if (query.search?.toLocaleLowerCase('pl-PL') === 'obecnie') {
            searchFilter = { endProduction: null };
        } else if (query.search) {
            const productionYear = Number(query.search);
            if (!/^\d+$/.test(query.search) || !Number.isInteger(productionYear)
                || productionYear < 1886 || productionYear > 2147483647) {
                return { items: [], total: 0 };
            }
            searchFilter = { OR: [{ startProduction: productionYear }, { endProduction: productionYear }] };
        }

        const where: Prisma.CarGenerationWhereInput = {
            carModelId,
            deletedAt: null,
            carModel: { deletedAt: null, carBrand: { deletedAt: null } },
            ...searchFilter,
        };
        const [items, total] = await prisma.$transaction([
            prisma.carGeneration.findMany({
                where,
                select: carGenerationSelect,
                orderBy: [
                    { carModel: { carBrand: { name: 'asc' } } },
                    { carModel: { name: 'asc' } },
                    { startProduction: 'desc' },
                    { id: 'asc' },
                ],
                skip: (query.page - 1) * query.pageSize,
                take: query.pageSize,
            }),
            prisma.carGeneration.count({ where }),
        ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
        return { items, total };
    }

    static findAll() {
        return prisma.carGeneration.findMany({
            where: {
                deletedAt: null,
                carModel: {
                    deletedAt: null,
                    carBrand: {
                        deletedAt: null,
                    },
                },
            },
            select: carGenerationSelect,
            orderBy: [
                {
                    carModel: {
                        carBrand: {
                            name: 'asc',
                        },
                    },
                },
                {
                    carModel: {
                        name: 'asc',
                    },
                },
                {
                    startProduction: 'desc',
                },
            ],
        });
    }

    static findByCarModel(carModelId: string) {
        return prisma.carGeneration.findMany({
            where: {
                carModelId,
                deletedAt: null,
                carModel: {
                    deletedAt: null,
                    carBrand: {
                        deletedAt: null,
                    },
                },
            },
            select: carGenerationSelect,
            orderBy: {
                startProduction: 'desc',
            },
        });
    }

    static findById(carGenerationId: string) {
        return prisma.carGeneration.findFirst({
            where: {
                id: carGenerationId,
                deletedAt: null,
                carModel: {
                    deletedAt: null,
                    carBrand: {
                        deletedAt: null,
                    },
                },
            },
            select: carGenerationSelect,
        });
    }

    static create(carGenerationData: CreateCarGenerationDTO) {
        return prisma.carGeneration.create({
            data: carGenerationData,
            select: carGenerationSelect,
        });
    }

    static update(carGenerationId: string, carGenerationData: UpdateCarGenerationDTO) {
        return prisma.carGeneration.update({
            where: {
                id: carGenerationId,
                deletedAt: null,
            },
            data: carGenerationData,
            select: carGenerationSelect,
        });
    }

    static countAssignedFitments(carGenerationId: string) {
        return prisma.productFitment.count({
            where: {
                carGenerationId,
                deletedAt: null,
            },
        });
    }

    static softDelete(carGenerationId: string) {
        return prisma.carGeneration.update({
            where: {
                id: carGenerationId,
                deletedAt: null,
            },
            data: {
                deletedAt: new Date(),
            },
        });
    }

    static findActiveCarModel(carModelId: string) {
        return prisma.carModel.findFirst({
            where: {
                id: carModelId,
                deletedAt: null,
                carBrand: {
                    deletedAt: null,
                },
            },
            select: {
                id: true,
            },
        });
    }

    static findConflictingGeneration(
        carGenerationData: CreateCarGenerationDTO,
        excludedCarGenerationId?: string,
    ) {
        return prisma.carGeneration.findFirst({
            where: {
                id: excludedCarGenerationId
                    ? {
                        not: excludedCarGenerationId,
                    }
                    : undefined,
                deletedAt: null,
                carModelId: carGenerationData.carModelId,
                startProduction: carGenerationData.startProduction,
                endProduction: carGenerationData.endProduction,
            },
            select: {
                id: true,
            },
        });
    }
}
