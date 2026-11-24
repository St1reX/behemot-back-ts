import { OperationStatus } from '@prisma/client';
import { PaginatedListQuery } from '../../shared/schema/pagination.schema';
import { PaginatedResponse } from '../../shared/types/pagination.types';
import { AppError, ErrorNames } from '../../errors/errorHandler';
import { createAuditLog } from '../../infrastructure/audit/auditLogger';
import { ACTIONS } from '../../shared/constants/actions';
import { ENTITIES } from '../../shared/constants/entities';
import { CarBrandRepository } from './repositories/carBrandRepository';
import { CreateCarBrandDTO, UpdateCarBrandDTO } from './schemas/carBrand.schema';
import { CarBrandResponse, DeleteCarBrandResponse } from './types/carBrand.types';

export class CarBrandService {
    static async getCarBrands(query?: PaginatedListQuery): Promise<CarBrandResponse[] | PaginatedResponse<CarBrandResponse>> {
        if (!query) return CarBrandRepository.findAll();

        const { items, total } = await CarBrandRepository.findPage(query);
        return { items, total, page: query.page, pageSize: query.pageSize };
    }

    static async getCarBrand(carBrandId: string): Promise<CarBrandResponse> {
        const carBrand = await CarBrandRepository.findById(carBrandId);

        if (!carBrand) {
            throw new AppError(ErrorNames.RESOURCE_NOT_FOUND, 404, 'Nie znaleziono marki pojazdu.');
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

        if (await CarBrandRepository.countAssignedFitments(carBrandId)) {
            throw new AppError(ErrorNames.CONFLICT, 409, 'Nie można usunąć pojazdu przypisanego do produktów.');
        }

        const assignedCarModelsCount = await CarBrandRepository.countAssignedModels(carBrandId);

        if (assignedCarModelsCount > 0) {
            throw new AppError(
                ErrorNames.CONFLICT,
                409,
                'Nie można usunąć marki, która ma modele. Najpierw usuń jej modele.',
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
            throw new AppError(ErrorNames.CONFLICT, 409, 'Marka o tej nazwie już istnieje.');
        }
    }
}
