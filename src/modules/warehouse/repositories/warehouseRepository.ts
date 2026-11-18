import { prisma } from '../../../config/database';
import { CreateWarehouseDTO, UpdateWarehouseDTO } from '../schemas/warehouse.schema';

const warehouseSelect = {
    id: true,
    name: true,
    postalCode: true,
    city: true,
    street: true,
    buildingNumber: true,
    createdAt: true,
    updatedAt: true,
};

export class WarehouseRepository {
    static findAll() {
        return prisma.warehouse.findMany({
            where: {
                deletedAt: null,
            },
            select: warehouseSelect,
            orderBy: {
                name: 'asc',
            },
        });
    }

    static findById(warehouseId: string) {
        return prisma.warehouse.findFirst({
            where: {
                id: warehouseId,
                deletedAt: null,
            },
            select: warehouseSelect,
        });
    }

    static create(warehouseData: CreateWarehouseDTO) {
        return prisma.warehouse.create({
            data: warehouseData,
            select: warehouseSelect,
        });
    }

    static update(warehouseId: string, warehouseData: UpdateWarehouseDTO) {
        return prisma.warehouse.update({
            where: {
                id: warehouseId,
                deletedAt: null,
            },
            data: warehouseData,
            select: warehouseSelect,
        });
    }

    static countAssignedProducts(warehouseId: string) {
        return prisma.product.count({
            where: {
                warehouseId,
                deletedAt: null,
            },
        });
    }

    static softDelete(warehouseId: string) {
        return prisma.warehouse.update({
            where: {
                id: warehouseId,
                deletedAt: null,
            },
            data: {
                deletedAt: new Date(),
            },
        });
    }

    static findByName(warehouseName: string, excludedWarehouseId?: string) {
        return prisma.warehouse.findFirst({
            where: {
                id: excludedWarehouseId
                    ? {
                        not: excludedWarehouseId,
                    }
                    : undefined,
                deletedAt: null,
                name: warehouseName,
            },
            select: {
                id: true,
            },
        });
    }
}
