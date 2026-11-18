import { OperationStatus } from '@prisma/client';
import { AppError, ErrorNames } from '../../errors/errorHandler';
import { createAuditLog } from '../../infrastructure/audit/auditLogger';
import { ACTIONS } from '../../shared/constants/actions';
import { ENTITIES } from '../../shared/constants/entities';
import { WarehouseRepository } from './repositories/warehouseRepository';
import { CreateWarehouseDTO, UpdateWarehouseDTO } from './schemas/warehouse.schema';
import { DeleteWarehouseResponse, WarehouseResponse } from './types/warehouse.types';

export class WarehouseService {
    static async getWarehouses(): Promise<WarehouseResponse[]> {
        return WarehouseRepository.findAll();
    }

    static async getWarehouse(warehouseId: string): Promise<WarehouseResponse> {
        const warehouse = await WarehouseRepository.findById(warehouseId);

        if (!warehouse) {
            throw new AppError(ErrorNames.RESOURCE_NOT_FOUND, 404, 'Warehouse not found');
        }

        return warehouse;
    }

    static async createWarehouse(warehouseData: CreateWarehouseDTO): Promise<WarehouseResponse> {
        await this.ensureWarehouseNameIsAvailable(warehouseData.name);

        const createdWarehouse = await WarehouseRepository.create(warehouseData);

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

        const updatedWarehouse = await WarehouseRepository.update(warehouseId, warehouseData);

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

        const assignedProductsCount = await WarehouseRepository.countAssignedProducts(warehouseId);

        if (assignedProductsCount > 0) {
            throw new AppError(
                ErrorNames.CONFLICT,
                409,
                'Warehouse cannot be deleted because it is assigned to a product',
            );
        }

        await WarehouseRepository.softDelete(warehouseId);

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
        const existingWarehouse = await WarehouseRepository.findByName(warehouseName, excludedWarehouseId);

        if (existingWarehouse) {
            throw new AppError(ErrorNames.CONFLICT, 409, 'Warehouse name is already in use');
        }
    }
}
