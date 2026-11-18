import { prisma } from '../../../config/database';
import { CreateCarModelDTO, UpdateCarModelDTO } from '../schemas/carModel.schema';

const carModelSelect = {
    id: true,
    name: true,
    carBrand: {
        select: {
            id: true,
            name: true,
        },
    },
    createdAt: true,
    updatedAt: true,
};

export class CarModelRepository {
    static findAll() {
        return prisma.carModel.findMany({
            where: {
                deletedAt: null,
                carBrand: {
                    deletedAt: null,
                },
            },
            select: carModelSelect,
            orderBy: [
                {
                    carBrand: {
                        name: 'asc',
                    },
                },
                {
                    name: 'asc',
                },
            ],
        });
    }

    static findByCarBrand(carBrandId: string) {
        return prisma.carModel.findMany({
            where: {
                carBrandId,
                deletedAt: null,
                carBrand: {
                    deletedAt: null,
                },
            },
            select: carModelSelect,
            orderBy: {
                name: 'asc',
            },
        });
    }

    static findById(carModelId: string) {
        return prisma.carModel.findFirst({
            where: {
                id: carModelId,
                deletedAt: null,
                carBrand: {
                    deletedAt: null,
                },
            },
            select: carModelSelect,
        });
    }

    static create(carModelData: CreateCarModelDTO) {
        return prisma.carModel.create({
            data: carModelData,
            select: carModelSelect,
        });
    }

    static update(carModelId: string, carModelData: UpdateCarModelDTO) {
        return prisma.carModel.update({
            where: {
                id: carModelId,
                deletedAt: null,
            },
            data: carModelData,
            select: carModelSelect,
        });
    }

    static countAssignedGenerations(carModelId: string) {
        return prisma.carGeneration.count({
            where: {
                carModelId,
                deletedAt: null,
            },
        });
    }

    static softDelete(carModelId: string) {
        return prisma.carModel.update({
            where: {
                id: carModelId,
                deletedAt: null,
            },
            data: {
                deletedAt: new Date(),
            },
        });
    }

    static findActiveCarBrand(carBrandId: string) {
        return prisma.carBrand.findFirst({
            where: {
                id: carBrandId,
                deletedAt: null,
            },
            select: {
                id: true,
            },
        });
    }

    static findConflictingModel(carModelData: CreateCarModelDTO, excludedCarModelId?: string) {
        return prisma.carModel.findFirst({
            where: {
                id: excludedCarModelId
                    ? {
                        not: excludedCarModelId,
                    }
                    : undefined,
                deletedAt: null,
                carBrandId: carModelData.carBrandId,
                name: carModelData.name,
            },
            select: {
                id: true,
            },
        });
    }
}
