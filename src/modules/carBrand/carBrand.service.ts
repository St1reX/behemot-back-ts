import { OperationStatus } from '@prisma/client';
import { AppError, ErrorNames } from '../../errors/errorHandler';
import { createAuditLog } from '../../infrastructure/audit/auditLogger';
import { ACTIONS } from '../../shared/constants/actions';
import { ENTITIES } from '../../shared/constants/entities';
import { CarBrandRepository } from './repositories/carBrandRepository';
import { CreateCarBrandDTO, UpdateCarBrandDTO } from './schemas/carBrand.schema';
import { CarBrandResponse, DeleteCarBrandResponse } from './types/carBrand.types';

export class CarBrandService {
    static async getCarBrands(): Promise<CarBrandResponse[]> {
        return CarBrandRepository.findAll();
    }

    static async getCarBrand(carBrandId: string): Promise<CarBrandResponse> {
        const carBrand = await CarBrandRepository.findById(carBrandId);

        if (!carBrand) {
            throw new AppError(ErrorNames.RESOURCE_NOT_FOUND, 404, 'Car brand not found');
        }

        return carBrand;
    }

    static async createCarBrand(carBrandData: CreateCarBrandDTO): Promise<CarBrandResponse> {
        await this.ensureCarBrandNameIsAvailable(carBrandData.name);

        const createdCarBrand = await CarBrandRepository.create(carBrandData);

        await createAuditLog({
            entityName: ENTITIES.CAR_BRAND,
            entityId: createdCarBrand.id,
            action: ACTIONS.CREATE,
            operationStatus: OperationStatus.SUCCESS,
            dataBefore: null,
            dataAfter: createdCarBrand,
        });

        return createdCarBrand;
    }

    static async updateCarBrand(
        carBrandId: string,
        carBrandData: UpdateCarBrandDTO,
    ): Promise<CarBrandResponse> {
        const existingCarBrand = await this.getCarBrand(carBrandId);

        await this.ensureCarBrandNameIsAvailable(carBrandData.name, carBrandId);

        const updatedCarBrand = await CarBrandRepository.update(carBrandId, carBrandData);

        await createAuditLog({
            entityName: ENTITIES.CAR_BRAND,
            entityId: carBrandId,
            action: ACTIONS.UPDATE,
            operationStatus: OperationStatus.SUCCESS,
            dataBefore: existingCarBrand,
            dataAfter: updatedCarBrand,
        });

        return updatedCarBrand;
    }

    static async deleteCarBrand(carBrandId: string): Promise<DeleteCarBrandResponse> {
        const existingCarBrand = await this.getCarBrand(carBrandId);

        const assignedCarModelsCount = await CarBrandRepository.countAssignedModels(carBrandId);

        if (assignedCarModelsCount > 0) {
            throw new AppError(
                ErrorNames.CONFLICT,
                409,
                'Car brand cannot be deleted because it is assigned to a car model',
            );
        }

        await CarBrandRepository.softDelete(carBrandId);

        await createAuditLog({
            entityName: ENTITIES.CAR_BRAND,
            entityId: carBrandId,
            action: ACTIONS.DELETE,
            operationStatus: OperationStatus.SUCCESS,
            dataBefore: existingCarBrand,
            dataAfter: null,
        });

        return {
            message: 'Car brand has been deleted successfully',
        };
    }

    private static async ensureCarBrandNameIsAvailable(
        carBrandName: string,
        excludedCarBrandId?: string,
    ) {
        const existingCarBrand = await CarBrandRepository.findByName(carBrandName, excludedCarBrandId);

        if (existingCarBrand) {
            throw new AppError(ErrorNames.CONFLICT, 409, 'Car brand name is already in use');
        }
    }
}
