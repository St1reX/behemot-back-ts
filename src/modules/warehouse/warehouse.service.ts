import { OperationStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError, ErrorNames } from '../../errors/errorHandler';
import { createAuditLog } from '../../infrastructure/audit/auditLogger';
import { ACTIONS } from '../../shared/constants/actions';
import { ENTITIES } from '../../shared/constants/entities';
import { CreateWarehouseDTO, UpdateWarehouseDTO } from './schemas/warehouse.schema';
import { DeleteWarehouseResponse, WarehouseResponse } from './types/warehouse.types';

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

export class WarehouseService {
    static async getWarehouses(): Promise<WarehouseResponse[]> {
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

    static async getWarehouse(warehouseId: string): Promise<WarehouseResponse> {
        const warehouse = await prisma.warehouse.findFirst({
            where: {
                id: warehouseId,
                deletedAt: null,
            },
            select: warehouseSelect,
        });

        if (!warehouse) {
            throw new AppError(ErrorNames.RESOURCE_NOT_FOUND, 404, 'Warehouse not found');
        }

        return warehouse;
    }

    static async createWarehouse(warehouseData: CreateWarehouseDTO): Promise<WarehouseResponse> {
        await this.ensureWarehouseNameIsAvailable(warehouseData.name);

        const createdWarehouse = await prisma.warehouse.create({
            data: warehouseData,
            select: warehouseSelect,
        });

        await createAuditLog({
            entityName: ENTITIES.WAREHOUSE,
            entityId: createdWarehouse.id,
            action: ACTIONS.CREATE,
            operationStatus: OperationStatus.SUCCESS,
            dataBefore: null,
            dataAfter: createdWarehouse,
        });

        return createdWarehouse;
    }

    static async updateWarehouse(
        warehouseId: string,
        warehouseData: UpdateWarehouseDTO,
    ): Promise<WarehouseResponse> {
        const existingWarehouse = await this.getWarehouse(warehouseId);

        await this.ensureWarehouseNameIsAvailable(warehouseData.name, warehouseId);

        const updatedWarehouse = await prisma.warehouse.update({
            where: {
                id: warehouseId,
                deletedAt: null,
            },
            data: warehouseData,
            select: warehouseSelect,
        });

        await createAuditLog({
            entityName: ENTITIES.WAREHOUSE,
            entityId: warehouseId,
            action: ACTIONS.UPDATE,
            operationStatus: OperationStatus.SUCCESS,
            dataBefore: existingWarehouse,
            dataAfter: updatedWarehouse,
        });

        return updatedWarehouse;
    }

    static async deleteWarehouse(warehouseId: string): Promise<DeleteWarehouseResponse> {
        const existingWarehouse = await this.getWarehouse(warehouseId);

        const assignedProductsCount = await prisma.product.count({
            where: {
                warehouseId,
                deletedAt: null,
            },
        });

        if (assignedProductsCount > 0) {
            throw new AppError(
                ErrorNames.CONFLICT,
                409,
                'Warehouse cannot be deleted because it is assigned to a product',
            );
        }

        await prisma.warehouse.update({
            where: {
                id: warehouseId,
                deletedAt: null,
            },
            data: {
                deletedAt: new Date(),
            },
        });

        await createAuditLog({
            entityName: ENTITIES.WAREHOUSE,
            entityId: warehouseId,
            action: ACTIONS.DELETE,
            operationStatus: OperationStatus.SUCCESS,
            dataBefore: existingWarehouse,
            dataAfter: null,
        });

        return {
            message: 'Warehouse has been deleted successfully',
        };
    }

    private static async ensureWarehouseNameIsAvailable(
        warehouseName: string,
        excludedWarehouseId?: string,
    ) {
        const existingWarehouse = await prisma.warehouse.findFirst({
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

        if (existingWarehouse) {
            throw new AppError(ErrorNames.CONFLICT, 409, 'Warehouse name is already in use');
        }
    }
}
