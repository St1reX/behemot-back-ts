import { prisma } from '../../../config/database';
import { CreateCarBrandDTO, UpdateCarBrandDTO } from '../schemas/carBrand.schema';

const carBrandSelect = {
    id: true,
    name: true,
    createdAt: true,
    updatedAt: true,
};

export class CarBrandRepository {
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
